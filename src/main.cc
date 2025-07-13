#include "services/leetcode.hh"
#include <cstdlib>
#include <curl/curl.h>
#include <dpp/dpp.h>
#include <exception>
#include <spdlog/spdlog.h>
#include <stdexcept>

int main() {
  // Set global log level for spdlog
  spdlog::set_level(spdlog::level::debug);

  // Initialize curl globally
  if (curl_global_init(CURL_GLOBAL_ALL) != 0) {
    spdlog::critical("curl_global_init failed");
    return EXIT_FAILURE;
  }

  // Download LeetCode data
  if (!leetcode::download_data()) {
    curl_global_cleanup();
    return EXIT_FAILURE;
  };

  try {
    // Get bot token from environment
    spdlog::info("Loading bot token from environment variable BOT_TOKEN.");
    const char *token = std::getenv("BOT_TOKEN");
    if (!token) {
      throw std::runtime_error(
          "The environment variable \"BOT_TOKEN\" is not set.");
    }
    spdlog::info("Loaded bot token successfully.");

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

    // Start the bot
    spdlog::info("Starting Discord bot...");
    bot.start(dpp::st_wait);
  } catch (const std::exception &e) {
    spdlog::critical(e.what());
    curl_global_cleanup(); // Clean up curl global state before exit
    return EXIT_FAILURE;
  }

  // Clean up curl global state
  curl_global_cleanup();

  return EXIT_SUCCESS;
}