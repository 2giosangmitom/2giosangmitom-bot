#include <dpp/dpp.h>
#include <fstream>
#include <nlohmann/json.hpp>
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

int main() {
  Data data;

  try {
    // Read JSON file
    std::ifstream ifs("data.json");
    if (!ifs.is_open()) {
      throw std::logic_error("'data.json' file not found!");
    }

    nlohmann::json json_data;
    ifs >> json_data;

    // Parse JSON into Data struct
    data = json_data["data"]["problemsetQuestionList"].get<Data>();

    std::cout << "Total Questions: " << data.total << "\n";

    const string TOKEN = get_token();

    dpp::cluster bot(TOKEN);

    bot.on_log(dpp::utility::cout_logger());

    bot.on_slashcommand([](const dpp::slashcommand_t &event) {
      if (event.command.get_command_name() == "ping") {
        event.reply("Pong!");
      }
    });

    bot.on_ready([&bot](const dpp::ready_t &event) {
      if (dpp::run_once<struct register_bot_commands>()) {
        bot.global_command_create(
            dpp::slashcommand("ping", "Ping pong!", bot.me.id));
      }
    });

    bot.start(dpp::st_wait);
  } catch (std::logic_error &e) {
    std::cerr << e.what();
  }
}
