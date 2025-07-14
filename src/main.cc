#include "services/leetcode.hh"
#include "utils/string.hh"
#include <boost/beast.hpp>
#include <csignal>
#include <cstdlib>
#include <curl/curl.h>
#include <dpp/dpp.h>
#include <exception>
#include <optional>
#include <spdlog/spdlog.h>
#include <sstream>
#include <string>
#include <thread>
#include <variant>

namespace beast = boost::beast;
namespace http = beast::http;
namespace net = boost::asio;
using tcp = net::ip::tcp;

void run_http_server(unsigned short port) {
  std::thread([port]() {
    try {
      net::io_context ioc{1};

      tcp::acceptor acceptor{ioc, {tcp::v4(), port}};

      for (;;) {
        tcp::socket socket{ioc};
        acceptor.accept(socket);

        // Handle one request per connection
        beast::flat_buffer buffer;
        http::request<http::string_body> req;
        http::read(socket, buffer, req);

        http::response<http::string_body> res{http::status::ok, req.version()};
        res.set(http::field::server, "2giosangmitom-bot");
        res.set(http::field::content_type, "text/plain");
        res.keep_alive(req.keep_alive());
        res.body() = "The 2giosangmitom-bot is running";
        res.prepare_payload();

        http::write(socket, res);
      }
    } catch (const std::exception &e) {
      std::cerr << "[HTTP Server] Error: " << e.what() << std::endl;
    }
  }).detach();
}

int main() {
  // Run http server
  run_http_server(8080);

  // Set global log level for spdlog
  spdlog::set_level(spdlog::level::debug);

  // Get bot token from environment
  spdlog::info("Loading bot token from environment variable BOT_TOKEN.");
  const char *token = std::getenv("BOT_TOKEN");
  if (!token) {
    spdlog::critical("The environment variable \"BOT_TOKEN\" is not set.");
    return EXIT_FAILURE;
  }

  if (std::string(token).find("MTA") == 0) {
    spdlog::warn("You may be using a placeholder Discord bot token.");
  }

  spdlog::info("Loaded bot token successfully.");

  // Register cleanup when exit
  std::atexit([]() {
    spdlog::info("Cleaning up global curl");
    curl_global_cleanup();
  });

  // Handle SIGINT signal
  std::signal(SIGINT, [](int) {
    spdlog::warn("Received SIGINT (Ctrl+C)");
    std::exit(EXIT_SUCCESS); // triggers atexit cleanup
  });

  // Initialize curl globally
  if (curl_global_init(CURL_GLOBAL_ALL) != 0) {
    spdlog::critical("Failed to initialize global curl");
    return EXIT_FAILURE;
  }

  // Load LeetCode data
  leetcode::Data data;
  try {
    spdlog::info("Loading \"data.json\"");
    data = leetcode::load_data_json();
  } catch (const std::exception &e) {
    spdlog::warn("Initial load failed: {}", e.what());
    spdlog::info("Attempting to download latest data...");
    if (!leetcode::download_data()) {
      spdlog::critical("Failed to download fallback data");
      return EXIT_FAILURE;
    }

    try {
      spdlog::info("Loading \"data.json\" again");
      data = leetcode::load_data_json();
    } catch (const std::exception &e) {
      spdlog::critical("Retry also failed: {}", e.what());
      return EXIT_FAILURE;
    }
  }

  spdlog::info("Loaded {} problems and {} topics successfully.",
               data.metadata.totalProblems, data.topics.size());

  try {
    // Initialize the bot
    dpp::cluster bot(token);

    bot.on_log([](const dpp::log_t &event) {
      switch (event.severity) {
      case dpp::ll_trace:
        spdlog::trace(event.message);
        break;
      case dpp::ll_debug:
        spdlog::debug(event.message);
        break;
      case dpp::ll_info:
        spdlog::info(event.message);
        break;
      case dpp::ll_warning:
        spdlog::warn(event.message);
        break;
      case dpp::ll_error:
        spdlog::error(event.message);
        break;
      case dpp::ll_critical:
        spdlog::critical(event.message);
        break;
      default:
        spdlog::info(event.message);
        break;
      }
    });

    // Slash command handler
    bot.on_slashcommand([&data](const dpp::slashcommand_t &event) {
      const auto command_name = event.command.get_command_name();

      try {
        if (command_name == "leetcode") {
          std::optional<std::vector<std::string>> difficulties;
          std::optional<std::vector<std::string>> topics;
          std::optional<int> quantity;

          const auto diff_param = event.get_parameter("difficulties");
          if (std::holds_alternative<std::string>(diff_param)) {
            difficulties =
                string_utils::split(std::get<std::string>(diff_param), ',');
          }

          const auto topics_param = event.get_parameter("topics");
          if (std::holds_alternative<std::string>(topics_param)) {
            topics =
                string_utils::split(std::get<std::string>(topics_param), ',');
          }

          const auto quantity_param = event.get_parameter("quantity");
          if (std::holds_alternative<double>(quantity_param)) {
            quantity = static_cast<int>(std::get<double>(quantity_param));
          }

          // Filter and pick
          auto filtered_problems =
              leetcode::filter_questions(data.problems, difficulties, topics);
          auto problems = leetcode::get_questions(filtered_problems, quantity);

          std::stringstream desc;
          for (const auto &p : problems) {
            const std::string topic_list =
                p.topics.empty() ? "No topics"
                                 : string_utils::join(p.topics, ", ");

            desc << fmt::format(
                "**📖 {}**\n📊 **Difficulty**: {}\n🏷️ **Topics**: {}\n📈 "
                "**Acceptance**: {:.1f}%\n🔗 **Link**: <{}>\n\n",
                p.title, string_utils::to_title(p.difficulty), topic_list,
                p.ac_rate * 100, p.url);
          }

          desc << fmt::format(
              "🧩 Total: {} question(s) found from {} available problems",
              problems.size(), data.metadata.totalProblems);

          dpp::embed embed =
              dpp::embed()
                  .set_color(dpp::colors::baby_pink)
                  .set_title("🧩 Random LeetCode Problems")
                  .set_description(desc.str())
                  .set_footer(dpp::embed_footer().set_text(fmt::format(
                      "Powered by 2giosangmitom-bot • Last updated: {}",
                      data.metadata.lastUpdated)));

          event.reply(dpp::message(event.command.channel_id, embed));

        } else if (command_name == "waifu") {
          spdlog::info("Received waifu command.");
          event.reply("😳 Coming soon...");
        }
      } catch (const std::exception &e) {
        event.reply(fmt::format("❌ Error: {}", e.what()));
      }
    });

    bot.on_ready([&bot](const dpp::ready_t &event) {
      // Set bot presence
      if (dpp::run_once<struct set_bot_presence>()) {
        bot.set_presence(dpp::presence(
            dpp::ps_online, dpp::at_custom,
            fmt::format("Sleeping in {} servers", event.guild_count)));
      }

      if (dpp::run_once<struct register_bot_commands>()) {
        // LeetCode command
        dpp::slashcommand leetcode("leetcode", "Get random LeetCode problems",
                                   bot.me.id);
        leetcode.add_option(dpp::command_option(dpp::co_string, "difficulties",
                                                "Allowed problem difficulties",
                                                false)
                                .set_auto_complete(true));
        leetcode.add_option(dpp::command_option(dpp::co_string, "topics",
                                                "Problem topics", false)
                                .set_auto_complete(true));
        leetcode.add_option(dpp::command_option(
            dpp::co_number, "quantity", "Number of problems (1-10)", false));

        // Waifu command
        dpp::slashcommand waifu(
            "waifu", "Get random cute anime girl for motivation", bot.me.id);
        waifu.add_option(dpp::command_option(dpp::co_string, "category",
                                             "Image category", false)
                             .set_auto_complete(true));

        bot.global_bulk_command_create({leetcode, waifu});
      }
    });

    // Start the bot
    spdlog::info("2giosangmitom-bot starting...");
    bot.start(dpp::st_wait);
  } catch (const std::exception &e) {
    spdlog::critical(e.what());
    return EXIT_FAILURE;
  }

  return EXIT_SUCCESS;
}
