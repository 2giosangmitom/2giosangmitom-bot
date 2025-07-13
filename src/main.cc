#include "services/leetcode.hh"
#include <cstdlib>
#include <curl/curl.h>
#include <dpp/dpp.h>
#include <exception>
#include <spdlog/spdlog.h>

int main() {
  // Set global log level for spdlog
  spdlog::set_level(spdlog::level::debug);

  // Get bot token from environment
  spdlog::info("Loading bot token from environment variable BOT_TOKEN.");
  const char *token = std::getenv("BOT_TOKEN");
  if (!token) {
    spdlog::critical("The environment variable \"BOT_TOKEN\" is not set.");
    return EXIT_FAILURE;
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
      throw;
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

        // Register commands
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