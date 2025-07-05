#include <algorithm>
#include <dpp/dpp.h>
#include <fstream>
#include <nlohmann/json.hpp>
#include <optional>
#include <random>
#include <stdexcept>

using std::ifstream;
using std::string;
using std::vector;

struct Topic {
  string name;
};

struct Question {
  string questionId;
  string questionFrontendId;
  string title;
  string titleSlug;
  vector<Topic> topicTags;
  string difficulty;
  bool isPaidOnly;
};

struct Data {
  int total;
  vector<Question> questions;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Topic, name);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Question, questionId, questionFrontendId,
                                   title, titleSlug, topicTags, difficulty,
                                   isPaidOnly);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Data, total, questions);

string get_token() {
  ifstream fs("token.txt");
  if (!fs.is_open()) {
    throw std::logic_error("'token.txt' file not found!");
  }
  string buf;
  fs >> buf;
  fs.close();
  return buf;
}

vector<Question> filter_questions(const Data &data,
                                  const std::optional<string> &difficulty,
                                  const std::optional<string> &topic) {
  vector<Question> filtered;

  for (const auto &q : data.questions) {
    if (q.isPaidOnly)
      continue;

    if (difficulty.has_value() && q.difficulty != difficulty.value())
      continue;

    if (topic.has_value()) {
      bool has_topic =
          std::any_of(q.topicTags.begin(), q.topicTags.end(),
                      [&](const Topic &t) { return t.name == topic.value(); });
      if (!has_topic)
        continue;
    }

    filtered.push_back(q);
  }

  return filtered;
}

vector<Question> pick_random_questions(const vector<Question> &questions,
                                       int quantity) {
  if (questions.empty()) {
    throw std::logic_error("No matching free questions found.");
  }

  vector<Question> result;
  std::random_device rd;
  std::mt19937 gen(rd());

  if (quantity >= (int)questions.size()) {
    result = questions; // Return all available if quantity exceeds
  } else {
    vector<int> indices(questions.size());
    std::iota(indices.begin(), indices.end(), 0);
    std::shuffle(indices.begin(), indices.end(), gen);

    for (int i = 0; i < quantity; ++i) {
      result.push_back(questions[indices[i]]);
    }
  }

  return result;
}

int main() {
  Data data;

  try {
    std::ifstream ifs("data.json");
    if (!ifs.is_open()) {
      throw std::logic_error("'data.json' file not found!");
    }

    nlohmann::json json_data;
    ifs >> json_data;
    data = json_data["data"]["problemsetQuestionList"].get<Data>();
    ifs.close();

    const string TOKEN = get_token();
    dpp::cluster bot(TOKEN);

    bot.on_log(dpp::utility::cout_logger());

    bot.on_slashcommand([&data](const dpp::slashcommand_t &event) {
      if (event.command.get_command_name() == "get_questions") {
        try {
          std::optional<string> difficulty, topic;
          int quantity = 1;

          // Handle parameters
          auto diff_param = event.get_parameter("difficulty");
          if (diff_param.index() != 0) {
            difficulty = std::get<string>(diff_param);
          }

          auto topic_param = event.get_parameter("topic");
          if (topic_param.index() != 0) {
            topic = std::get<string>(topic_param);
          }

          auto quantity_param = event.get_parameter("quantity");
          if (quantity_param.index() != 0) {
            quantity = static_cast<int>(std::get<double>(quantity_param));
            if (quantity < 1)
              quantity = 1;
          }

          // Filter & Pick
          auto filtered = filter_questions(data, difficulty, topic);
          auto random_questions = pick_random_questions(filtered, quantity);

          string msg = "Here are your random questions:\n";
          for (const auto &q : random_questions) {
            msg += "- [" + q.title + "](https://leetcode.com/problems/" +
                   q.titleSlug + "/) (" + q.difficulty + ")\n";
          }

          event.reply(dpp::message(msg).set_allowed_mentions(false));
        } catch (const std::logic_error &e) {
          event.reply(e.what());
        }
      }
    });

    bot.on_ready([&bot](const dpp::ready_t &) {
      if (dpp::run_once<struct register_bot_commands>()) {
        dpp::slashcommand get_questions(
            "get_questions", "Get random free LeetCode questions", bot.me.id);
        get_questions.add_option(dpp::command_option(dpp::co_string,
                                                     "difficulty", "Difficulty",
                                                     false)
                                     .set_auto_complete(true));
        get_questions.add_option(
            dpp::command_option(dpp::co_string, "topic", "Topic tag", false));
        get_questions.add_option(dpp::command_option(
            dpp::co_number, "quantity", "Number of questions", false));

        bot.global_bulk_command_create({get_questions});
      }
    });

    bot.on_autocomplete([&bot](const dpp::autocomplete_t &event) {
      for (const auto &opt : event.options) {
        if (opt.focused && opt.name == "difficulty") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);
          vector<string> difficulties{"Easy", "Medium", "Hard"};

          for (const auto &d : difficulties) {
            if (std::get<string>(opt.value).empty() ||
                d.find(std::get<string>(opt.value)) != string::npos) {
              res.add_autocomplete_choice(dpp::command_option_choice(d, d));
            }
          }

          bot.interaction_response_create(event.command.id, event.command.token,
                                          res);
          break;
        }
      }
    });

    bot.start(dpp::st_wait);
  } catch (const std::exception &e) {
    std::cerr << "Fatal Error: " << e.what() << '\n';
  }
}
