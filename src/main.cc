#include <algorithm>
#include <atomic>
#include <dpp/dpp.h>
#include <filesystem>
#include <format>
#include <fstream>
#include <future>
#include <iostream>
#include <nlohmann/json.hpp>
#include <numeric>
#include <optional>
#include <ostream>
#include <print>
#include <random>
#include <set>
#include <sstream>
#include <stdexcept>
#include <thread>

using std::format;
using std::ifstream;
using std::ofstream;
using std::ostringstream;
using std::println;
using std::string;
using std::vector;

// Topic tag model
struct Topic {
  string name;
  string slug;
};

// Question model
struct Question {
  int id;
  string questionFrontendId;
  string title;
  string titleSlug;
  vector<Topic> topicTags;
  string difficulty;
  bool paidOnly;
  double acRate;
};

// Container for the list
struct Data {
  int totalLength;
  vector<Question> questions;
};

// JSON serialization
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Topic, name, slug);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Question, id, questionFrontendId, title,
                                   titleSlug, topicTags, difficulty, paidOnly,
                                   acRate);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Data, totalLength, questions);

// Load Discord Bot token from "token.txt"
string get_token() {
  ifstream fs("token.txt");
  if (!fs.is_open()) {
    throw std::runtime_error("\"token.txt\" file not found!");
  }
  string token;
  fs >> token;
  return token;
}

// Convert a string to lowercase
string to_lower(const string &s) {
  string result = s;
  std::transform(result.begin(), result.end(), result.begin(), ::tolower);
  return result;
}

// Convert a string to titlecase
string to_title(const string &s) {
  string result = s;
  std::transform(result.begin(), result.end(), result.begin(), ::tolower);
  result[0] = toupper(result[0]);
  return result;
}

// Filter questions based on difficulty and topic
vector<Question> filter_questions(const Data &data,
                                  const std::optional<string> &difficulty,
                                  const std::optional<string> &topic) {
  vector<Question> filtered;

  for (const auto &q : data.questions) {
    if (q.paidOnly)
      continue;

    if (difficulty.has_value() &&
        !to_lower(difficulty.value()).contains(to_lower(q.difficulty)))
      continue;

    if (topic.has_value()) {
      bool has_topic = std::any_of(
          q.topicTags.begin(), q.topicTags.end(), [&](const Topic &t) {
            return to_lower(t.name) == to_lower(topic.value());
          });

      if (!has_topic)
        continue;
    }

    filtered.push_back(q);
  }

  return filtered;
}

// Pick random questions from a filtered list
vector<Question> pick_random_questions(const vector<Question> &questions,
                                       int quantity) {
  if (questions.empty()) {
    throw std::runtime_error("No matching free questions found.");
  }

  vector<Question> result;
  std::random_device rd;
  std::mt19937 gen(rd());

  if (quantity >= static_cast<int>(questions.size())) {
    result = questions;
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

// Run a long running task with loading spinner
void spinner(std::atomic<bool> &running, const std::string &msg) {
  const char spinner_chars[] = {'|', '/', '-', '\\'};
  int i = 0;

  while (running.load()) {
    std::cout << "\r" << msg << " " << spinner_chars[i] << std::flush;
    i = (i + 1) % 4;
    std::this_thread::sleep_for(std::chrono::milliseconds(150));
  }

  std::cout << "\r" << msg << " ✓" << std::endl;
}

// Get data from LeetCode
Data get_data(dpp::cluster &bot) {
  if (!std::filesystem::exists("data.json")) {
    const std::string query = R"(
query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $skip: Int) {
  problemsetQuestionListV2(
    filters: $filters
    limit: $limit
    skip: $skip
  ) {
    questions {
      id
      titleSlug
      title
      questionFrontendId
      paidOnly
      difficulty
      topicTags {
        name
        slug
      }
      acRate
    }
    totalLength
  }
}
)";
    const nlohmann::json variables = {
        {"skip", 0},
        {"limit", 10000},
        {"categorySlug", "all-code-essentials"},
        {"filters",
         {{"filterCombineType", "ALL"},
          {"premiumFilter",
           {{"premiumStatus", nlohmann::json::array({"NOT_PREMIUM"})},
            {"operator", "IS"}}}}}};

    const nlohmann::json post_data = {{"query", query},
                                      {"variables", variables}};
    const std::string post_data_str = post_data.dump();

    // Promise/future to wait for HTTP request
    std::promise<void> promise;
    std::future<void> future = promise.get_future();

    // Spinner setup
    std::atomic<bool> spinner_running(true);
    std::thread spinner_thread(spinner, std::ref(spinner_running),
                               "Fetching data");

    // Send HTTP request
    bot.request(
        "https://leetcode.com/graphql", dpp::m_post,
        [&promise,
         &spinner_running](const dpp::http_request_completion_t &cc) mutable {
          try {
            std::ofstream ofs("data.json", std::ios::binary);
            ofs.exceptions(std::ofstream::failbit | std::ofstream::badbit);
            ofs.write(cc.body.data(),
                      static_cast<std::streamsize>(cc.body.size()));
            ofs.close();
          } catch (const std::ios_base::failure &e) {
            std::cerr << "File I/O error: " << e.what() << '\n';
          }
          spinner_running = false;
          promise.set_value();
        },
        post_data_str, "application/json");

    // Wait for HTTP request and spinner to finish
    future.wait();
    spinner_thread.join();
    std::cout << "Data saved to 'data.json'\n";
  }

  // Parse "data.json"
  std::ifstream ifs("data.json");
  if (!ifs) {
    throw std::runtime_error("Failed to open 'data.json'");
  }

  nlohmann::json json_data;
  ifs >> json_data;
  Data data = json_data["data"]["problemsetQuestionListV2"].get<Data>();
  ifs.close();

  return data;
}

int main() {
  try {
    const string TOKEN = get_token();
    dpp::cluster bot(TOKEN);
    bot.on_log(dpp::utility::cout_logger());

    Data data;

    // Extract unique topic names
    std::set<string> topic_set;

    // Slash command handler
    bot.on_slashcommand([&data](const dpp::slashcommand_t &event) {
      if (event.command.get_command_name() == "get_questions") {
        try {
          std::optional<string> difficulty, topic;
          int quantity = 1;

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

          if (quantity > 13)
            quantity = 13;

          auto filtered = filter_questions(data, difficulty, topic);
          auto random_questions = pick_random_questions(filtered, quantity);

          std::ostringstream desc;
          for (const auto &q : random_questions) {
            string difficulty_str = to_title(q.difficulty);
            string topic_list;
            if (!q.topicTags.empty()) {
              topic_list = q.topicTags[0].name;
              topic_list = std::accumulate(
                  std::next(q.topicTags.begin()), q.topicTags.end(), topic_list,
                  [](std::string a, const Topic &t) {
                    return std::move(a) + ", " + t.name;
                  });
            } else {
              topic_list = "(No topics)";
            }

            desc << std::format(
                "📌 **{}**\n**Difficulty**: {}\n**Topics**: {}\n", q.title,
                difficulty_str, topic_list);
            desc << std::format("Link: <https://leetcode.com/problems/{}>\n\n",
                                q.titleSlug);
          }

          desc << format("Total: {} question(s)", random_questions.size());

          dpp::embed embed = dpp::embed()
                                 .set_color(0x57F287) // Green
                                 .set_title("Random LeetCode questions")
                                 .set_description(desc.str())
                                 .set_footer(dpp::embed_footer().set_text(
                                     "Powered by 2giosangmitom-bot"))
                                 .set_timestamp(time(0));

          event.reply(dpp::message(event.command.channel_id, embed));
        } catch (const std::exception &e) {
          event.reply(format("Error: {}", e.what()));
        }
      }
    });

    // Autocomplete handler
    bot.on_autocomplete([&bot, &topic_set](const dpp::autocomplete_t &event) {
      for (const auto &opt : event.options) {
        string query = to_lower(std::get<string>(opt.value));

        if (opt.focused && opt.name == "difficulty") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);
          vector<string> difficulties{"Easy",         "Medium",
                                      "Hard",         "Easy to Medium",
                                      "Easy to Hard", "Medium to Hard"};

          for (const auto &d : difficulties) {
            if (query.empty() || d.find(query) != string::npos) {
              res.add_autocomplete_choice(dpp::command_option_choice(d, d));
            }
          }

          bot.interaction_response_create(event.command.id, event.command.token,
                                          res);
          break;
        } else if (opt.focused && opt.name == "topic") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);
          for (const auto &topic : topic_set) {
            if (query.empty() || topic.find(query) != string::npos) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(topic, topic));
            }
          }
          bot.interaction_response_create(event.command.id, event.command.token,
                                          res);
          break;
        }
      }
    });

    // Register slash commands after bot is ready
    bot.on_ready([&bot, &data, &topic_set](const dpp::ready_t &event) {
      // Set presence
      if (dpp::run_once<struct set_presence>()) {
        auto update_presence = [&bot, &event](auto) {
          std::string status =
              format("Sleeping in {} servers", event.guild_count);
          bot.set_presence(dpp::presence(
              dpp::ps_online, dpp::activity_type::at_custom, status));
        };

        update_presence(nullptr);
        // Update presence every 10 minutes
        bot.start_timer(update_presence, 600);
      }

      // Update data
      if (dpp::run_once<struct update_data>()) {
        // Update data
        auto update_data = [&data, &topic_set, &bot](auto) {
          data = get_data(bot);
          for (const auto &q : data.questions) {
            for (const auto &t : q.topicTags) {
              topic_set.insert(t.name);
            }
          }
        };

        update_data(nullptr);
        // Update data every 24 hours
        bot.start_timer(update_data, 86400, [&topic_set](auto) {
          if (std::filesystem::exists("data.json")) {
            std::cout << "Deleted \"data.json\"" << std::endl;
            std::filesystem::remove("data.json");
            topic_set.clear();
          }
        });
      }

      // Register bot commands
      if (dpp::run_once<struct register_bot_commands>()) {
        dpp::slashcommand get_questions(
            "get_questions", "Get random free LeetCode questions", bot.me.id);
        get_questions.add_option(dpp::command_option(dpp::co_string,
                                                     "difficulty", "Difficulty",
                                                     false)
                                     .set_auto_complete(true));
        get_questions.add_option(
            dpp::command_option(dpp::co_string, "topic", "Topic tag", false)
                .set_auto_complete(true));
        get_questions.add_option(dpp::command_option(
            dpp::co_number, "quantity", "Number of questions", false));

        bot.global_bulk_command_create({get_questions});
      }
    });

    bot.start(dpp::st_wait);
  } catch (const std::exception &e) {
    println(stderr, "Fatal error: {}", e.what());
  }
}
