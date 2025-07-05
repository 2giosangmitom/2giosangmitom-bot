#include <dpp/dpp.h>
#include <fstream>
#include <stdexcept>

using std::ifstream;
using std::string;

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
  try {
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
