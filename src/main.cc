#include <algorithm>
#include <atomic>
#include <chrono>
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

// Data model for waifu.pics response
struct WaifuPicsRes {
  string url;
};
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(WaifuPicsRes, url);

const vector<string> image_categories{"waifu", "hug",      "kiss",
                                      "happy", "handhold", "bite"};

// Convert a string to lowercase
string to_lower(const string &s) {
  string result = s;
  std::transform(result.begin(), result.end(), result.begin(),
                 [](unsigned char c) { return std::tolower(c); });
  return result;
}

// Fuzzy matching structure to store match results
struct FuzzyMatch {
  string value;
  int score;

  bool operator<(const FuzzyMatch &other) const {
    if (score != other.score) {
      return score > other.score; // Higher score first
    }
    return value < other.value; // Alphabetical for ties
  }
};

// FZF-style fuzzy matching algorithm
class FuzzyMatcher {
private:
  static constexpr int MATCH_SCORE = 16;
  static constexpr int GAP_START = -3;
  static constexpr int GAP_EXTENSION = -1;
  static constexpr int BONUS_BOUNDARY = 16;
  static constexpr int BONUS_NON_WORD = 8;
  static constexpr int BONUS_CAMEL = 8;
  static constexpr int BONUS_CONSECUTIVE = 6;
  static constexpr int BONUS_FIRST_CHAR_MULTIPLIER = 2;

  static bool is_word_boundary(char prev, char curr) {
    return (prev == ' ' || prev == '_' || prev == '-' || prev == '.' ||
            (std::islower(prev) && std::isupper(curr)));
  }

  static bool is_upper(char c) { return c >= 'A' && c <= 'Z'; }

  static bool is_lower(char c) { return c >= 'a' && c <= 'z'; }

public:
  static std::optional<int> fuzzy_match(const string &pattern,
                                        const string &text) {
    if (pattern.empty())
      return 0;
    if (text.empty())
      return std::nullopt;

    const string lower_pattern = to_lower(pattern);
    const string lower_text = to_lower(text);

    const size_t pattern_len = lower_pattern.length();
    const size_t text_len = lower_text.length();

    if (pattern_len > text_len)
      return std::nullopt;

    // Quick check: all pattern characters must exist in text
    size_t pattern_idx = 0;
    size_t text_idx = 0;

    while (pattern_idx < pattern_len && text_idx < text_len) {
      if (lower_pattern[pattern_idx] == lower_text[text_idx]) {
        pattern_idx++;
      }
      text_idx++;
    }

    if (pattern_idx != pattern_len) {
      return std::nullopt; // Not all pattern characters found
    }

    // Calculate detailed score
    vector<vector<int>> dp(pattern_len + 1, vector<int>(text_len + 1, INT_MIN));
    vector<vector<int>> gap_dp(pattern_len + 1,
                               vector<int>(text_len + 1, INT_MIN));

    // Initialize
    for (size_t j = 0; j <= text_len; j++) {
      dp[0][j] = 0;
    }

    for (size_t i = 1; i <= pattern_len; i++) {
      for (size_t j = 1; j <= text_len; j++) {
        char pattern_char = lower_pattern[i - 1];
        char text_char = lower_text[j - 1];
        char prev_char = (j > 1) ? text[j - 2] : ' ';

        // Gap extension
        if (j > 1) {
          gap_dp[i][j] = std::max(gap_dp[i][j - 1] + GAP_EXTENSION,
                                  dp[i][j - 1] + GAP_START);
        }

        // Character match
        if (pattern_char == text_char) {
          int score = MATCH_SCORE;

          // Bonus for word boundaries
          if (is_word_boundary(prev_char, text[j - 1])) {
            score += BONUS_BOUNDARY;
          }
          // Bonus for camelCase
          else if (is_lower(prev_char) && is_upper(text[j - 1])) {
            score += BONUS_CAMEL;
          }
          // Bonus for non-word characters
          else if (!std::isalnum(prev_char)) {
            score += BONUS_NON_WORD;
          }

          // Bonus for consecutive matches
          if (i > 1 && j > 1 && lower_pattern[i - 2] == lower_text[j - 2]) {
            score += BONUS_CONSECUTIVE;
          }

          // Bonus for first character
          if (i == 1) {
            score *= BONUS_FIRST_CHAR_MULTIPLIER;
          }

          dp[i][j] = dp[i - 1][j - 1] + score;
        }

        // Take the best score so far
        if (j > 1) {
          dp[i][j] = std::max(dp[i][j], gap_dp[i][j]);
        }
        if (i > 1) {
          dp[i][j] = std::max(dp[i][j], dp[i - 1][j]);
        }
      }
    }

    return dp[pattern_len][text_len] > INT_MIN
               ? std::optional<int>(dp[pattern_len][text_len])
               : std::nullopt;
  }

  static vector<FuzzyMatch> fuzzy_search(const string &pattern,
                                         const vector<string> &candidates,
                                         size_t max_results = 25) {
    vector<FuzzyMatch> matches;
    matches.reserve(candidates.size());

    for (const auto &candidate : candidates) {
      auto score = fuzzy_match(pattern, candidate);
      if (score.has_value()) {
        matches.push_back({candidate, score.value()});
      }
    }

    // Sort by score (highest first), then alphabetically
    std::sort(matches.begin(), matches.end());

    // Limit results
    if (matches.size() > max_results) {
      matches.resize(max_results);
    }

    return matches;
  }
};

// Load Discord Bot token from "token.txt"
string get_token() {
  ifstream fs("token.txt");
  if (!fs.is_open()) {
    throw std::runtime_error("\"token.txt\" file not found!");
  }
  string token;
  if (!(fs >> token) || token.empty()) {
    throw std::runtime_error("Invalid or empty token in \"token.txt\"");
  }
  return token;
}

// Convert a string to titlecase
string to_title(const string &s) {
  if (s.empty())
    return s;
  string result = s;
  std::transform(result.begin(), result.end(), result.begin(),
                 [](unsigned char c) { return std::tolower(c); });
  result[0] =
      static_cast<char>(std::toupper(static_cast<unsigned char>(result[0])));
  return result;
}

// Filter questions based on difficulty and topic
vector<Question> filter_questions(const Data &data,
                                  const std::optional<string> &difficulty,
                                  const std::optional<string> &topic) {
  vector<Question> filtered;
  filtered.reserve(data.questions.size());

  for (const auto &q : data.questions) {
    if (q.paidOnly)
      continue;

    if (difficulty.has_value()) {
      const string lower_difficulty = to_lower(difficulty.value());
      const string lower_q_difficulty = to_lower(q.difficulty);

      bool difficulty_matches = false;
      if (lower_difficulty == "easy to medium") {
        difficulty_matches =
            (lower_q_difficulty == "easy" || lower_q_difficulty == "medium");
      } else if (lower_difficulty == "easy to hard") {
        difficulty_matches = true;
      } else if (lower_difficulty == "medium to hard") {
        difficulty_matches =
            (lower_q_difficulty == "medium" || lower_q_difficulty == "hard");
      } else {
        difficulty_matches = (lower_q_difficulty == lower_difficulty);
      }

      if (!difficulty_matches)
        continue;
    }

    if (topic.has_value()) {
      const string lower_topic = to_lower(topic.value());
      bool has_topic = std::any_of(q.topicTags.begin(), q.topicTags.end(),
                                   [&lower_topic](const Topic &t) {
                                     return to_lower(t.name) == lower_topic;
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

  if (quantity <= 0) {
    throw std::invalid_argument("Quantity must be positive");
  }

  vector<Question> result;
  std::random_device rd;
  std::mt19937 gen(rd());

  if (quantity >= static_cast<int>(questions.size())) {
    result = questions;
  } else {
    vector<size_t> indices(questions.size());
    std::iota(indices.begin(), indices.end(), 0);
    std::shuffle(indices.begin(), indices.end(), gen);

    result.reserve(quantity);
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

    std::promise<void> promise;
    std::future<void> future = promise.get_future();

    std::atomic<bool> spinner_running(true);
    std::thread spinner_thread(spinner, std::ref(spinner_running),
                               "Fetching data");

    bot.request(
        "https://leetcode.com/graphql", dpp::m_post,
        [&promise,
         &spinner_running](const dpp::http_request_completion_t &cc) mutable {
          try {
            if (cc.status != 200) {
              std::cerr << "HTTP request failed with status: " << cc.status
                        << '\n';
              spinner_running = false;
              promise.set_exception(std::make_exception_ptr(
                  std::runtime_error("HTTP request failed")));
              return;
            }

            std::ofstream ofs("data.json", std::ios::binary);
            if (!ofs) {
              throw std::runtime_error("Failed to create data.json");
            }
            ofs.exceptions(std::ofstream::failbit | std::ofstream::badbit);
            ofs.write(cc.body.data(),
                      static_cast<std::streamsize>(cc.body.size()));
            ofs.close();
          } catch (const std::exception &e) {
            std::cerr << "Error saving data: " << e.what() << '\n';
            spinner_running = false;
            promise.set_exception(std::current_exception());
            return;
          }
          spinner_running = false;
          promise.set_value();
        },
        post_data_str, "application/json");

    try {
      future.get();
    } catch (const std::exception &e) {
      spinner_thread.join();
      throw;
    }
    spinner_thread.join();
    std::cout << "Data saved to 'data.json'\n";
  }

  std::ifstream ifs("data.json");
  if (!ifs) {
    throw std::runtime_error("Failed to open 'data.json'");
  }

  nlohmann::json json_data;
  try {
    ifs >> json_data;

    if (!json_data.contains("data") ||
        !json_data["data"].contains("problemsetQuestionListV2")) {
      throw std::runtime_error("Invalid JSON structure in data.json");
    }

    Data data = json_data["data"]["problemsetQuestionListV2"].get<Data>();
    return data;
  } catch (const nlohmann::json::exception &e) {
    throw std::runtime_error("JSON parsing error: " + std::string(e.what()));
  }
}

int main() {
  try {
    const string TOKEN = get_token();
    dpp::cluster bot(TOKEN);
    bot.on_log(dpp::utility::cout_logger());

    Data data;
    std::set<string> topic_set;

    // Slash command handler
    bot.on_slashcommand([&data, &bot](const dpp::slashcommand_t &event) {
      const auto command_name = event.command.get_command_name();

      if (command_name == "get_questions") {
        try {
          std::optional<string> difficulty, topic;
          int quantity = 1;

          const auto diff_param = event.get_parameter("difficulty");
          if (std::holds_alternative<string>(diff_param)) {
            difficulty = std::get<string>(diff_param);
          }

          const auto topic_param = event.get_parameter("topic");
          if (std::holds_alternative<string>(topic_param)) {
            topic = std::get<string>(topic_param);
          }

          const auto quantity_param = event.get_parameter("quantity");
          if (std::holds_alternative<double>(quantity_param)) {
            quantity = static_cast<int>(std::get<double>(quantity_param));
            quantity = std::clamp(quantity, 1, 13);
          }

          const auto filtered = filter_questions(data, difficulty, topic);
          const auto random_questions =
              pick_random_questions(filtered, quantity);

          std::ostringstream desc;
          for (const auto &q : random_questions) {
            const string difficulty_str = to_title(q.difficulty);
            string topic_list;
            if (!q.topicTags.empty()) {
              topic_list = q.topicTags[0].name;
              topic_list = std::accumulate(
                  std::next(q.topicTags.begin()), q.topicTags.end(), topic_list,
                  [](const std::string &a, const Topic &t) {
                    return a + ", " + t.name;
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
                                 .set_color(0x57F287)
                                 .set_title("Random LeetCode questions")
                                 .set_description(desc.str())
                                 .set_footer(dpp::embed_footer().set_text(
                                     "Powered by 2giosangmitom-bot"))
                                 .set_timestamp(time(0));

          event.reply(dpp::message(event.command.channel_id, embed));
        } catch (const std::exception &e) {
          event.reply(format("Error: {}", e.what()));
        }
      } else if (command_name == "motivation") {
        try {
          std::optional<std::string> category;
          const auto category_param = event.get_parameter("category");

          if (std::holds_alternative<std::string>(category_param)) {
            category = std::get<std::string>(category_param);
          }

          if (!category.has_value() || category->empty()) {
            if (!image_categories.empty()) {
              std::random_device rd;
              std::mt19937 gen(rd());
              std::uniform_int_distribution<> dist(0,
                                                   image_categories.size() - 1);
              category = image_categories[dist(gen)];
            } else {
              event.reply("No image categories available!");
              return;
            }
          }

          const std::string waifu_pics_url =
              format("https://api.waifu.pics/sfw/{}", category.value());

          event.thinking();

          bot.request(
              waifu_pics_url, dpp::m_get,
              [event, category](const dpp::http_request_completion_t &cc) {
                try {
                  if (cc.status != 200) {
                    event.edit_original_response(dpp::message(
                        "Failed to fetch image. Please try again."));
                    return;
                  }

                  const nlohmann::json res = nlohmann::json::parse(cc.body);
                  const WaifuPicsRes waifu_res = res.get<WaifuPicsRes>();

                  if (waifu_res.url.empty()) {
                    event.edit_original_response(
                        dpp::message("Received empty image URL."));
                    return;
                  }

                  const vector<string> titles = {
                      "Here's Your Daily Dose of Motivation ✨",
                      "A Waifu Appears! 💖",
                      "Stay Strong, Senpai! 💪",
                      "You Got This! Here's Some Motivation 🔥",
                      "Summoning Your Waifu... 💫",
                      "Your Waifu Believes in You! 🌸",
                      "Power Up Time! 🚀",
                      "Don't Give Up, Senpai! 💥",
                      "Waifu Buff Activated! ⚡",
                      "Keep Going, You're Doing Great! 🌟",
                      "One Step Closer to Victory! 🏆",
                      "Level Up Your Spirit! 🆙",
                      "Another Day, Another Quest! 🗺️",
                      "You're Stronger Than You Think! 🐉",
                      "Waifu's Blessing Incoming! 🍀"};

                  std::random_device rd;
                  std::mt19937 gen(rd());
                  std::uniform_int_distribution<> dist(0, titles.size() - 1);
                  const std::string random_title = titles[dist(gen)];

                  dpp::embed embed =
                      dpp::embed()
                          .set_color(dpp::colors::alien_green)
                          .set_title(random_title)
                          .set_description(
                              format("_Category: {}_", category.value()))
                          .set_image(waifu_res.url)
                          .set_footer(dpp::embed_footer().set_text(
                              "Powered by 2giosangmitom-bot"))
                          .set_timestamp(time(0));

                  event.edit_original_response(
                      dpp::message(event.command.channel_id, embed));
                } catch (const std::exception &e) {
                  event.edit_original_response(dpp::message(
                      format("Error processing image: {}", e.what())));
                }
              });
        } catch (const std::exception &e) {
          event.reply(format("Error: {}", e.what()));
        }
      }
    });

    // Enhanced Autocomplete handler with fuzzy matching
    bot.on_autocomplete([&bot, &topic_set](const dpp::autocomplete_t &event) {
      for (const auto &opt : event.options) {
        if (!std::holds_alternative<string>(opt.value))
          continue;

        const string query = std::get<string>(opt.value);

        if (opt.focused && opt.name == "difficulty") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);
          const vector<string> difficulties{"Easy",         "Medium",
                                            "Hard",         "Easy to Medium",
                                            "Easy to Hard", "Medium to Hard"};

          if (query.empty()) {
            // Show all options if no query
            for (const auto &d : difficulties) {
              res.add_autocomplete_choice(dpp::command_option_choice(d, d));
            }
          } else {
            // Use fuzzy matching
            auto matches = FuzzyMatcher::fuzzy_search(query, difficulties, 6);
            for (const auto &match : matches) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(match.value, match.value));
            }
          }

          bot.interaction_response_create(event.command.id, event.command.token,
                                          res);
          break;
        } else if (opt.focused && opt.name == "topic") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);

          // Convert set to vector for fuzzy matching
          vector<string> topics(topic_set.begin(), topic_set.end());

          if (query.empty()) {
            // Show first 25 topics alphabetically if no query
            std::sort(topics.begin(), topics.end());
            size_t limit = std::min(static_cast<size_t>(25), topics.size());
            for (size_t i = 0; i < limit; ++i) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(topics[i], topics[i]));
            }
          } else {
            // Use fuzzy matching
            auto matches = FuzzyMatcher::fuzzy_search(query, topics, 25);
            for (const auto &match : matches) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(match.value, match.value));
            }
          }

          bot.interaction_response_create(event.command.id, event.command.token,
                                          res);
          break;
        } else if (opt.focused && opt.name == "category") {
          dpp::interaction_response res(dpp::ir_autocomplete_reply);

          if (query.empty()) {
            // Show all categories if no query
            for (const auto &category_name : image_categories) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(category_name, category_name));
            }
          } else {
            // Use fuzzy matching
            auto matches =
                FuzzyMatcher::fuzzy_search(query, image_categories, 5);
            for (const auto &match : matches) {
              res.add_autocomplete_choice(
                  dpp::command_option_choice(match.value, match.value));
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
      if (dpp::run_once<struct update_data>()) {
        auto update_data = [&data, &topic_set, &bot](auto) {
          try {
            if (std::filesystem::exists("data.json")) {
              if (std::filesystem::remove("data.json")) {
                std::cout << "Deleted \"data.json\"" << std::endl;
                topic_set.clear();
              }
            }

            data = get_data(bot);
            topic_set.clear();
            for (const auto &q : data.questions) {
              for (const auto &t : q.topicTags) {
                topic_set.insert(t.name);
              }
            }
            std::cout << "Data updated successfully. Topics loaded: "
                      << topic_set.size() << std::endl;
          } catch (const std::exception &e) {
            std::cerr << "Failed to update data: " << e.what() << '\n';
          }
        };

        update_data(nullptr);

        bot.start_timer(update_data, 86400);
      }

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
            dpp::co_number, "quantity", "Number of questions (1-13)", false));

        dpp::slashcommand motivation(
            "motivation", "Get random cute anime girl to enhance motivation :)",
            bot.me.id);
        motivation.add_option(dpp::command_option(dpp::co_string, "category",
                                                  "Image category", false)
                                  .set_auto_complete(true));

        bot.global_bulk_command_create({get_questions, motivation});
      }
    });

    bot.start(dpp::st_wait);
  } catch (const std::exception &e) {
    println(stderr, "Fatal error: {}", e.what());
    return 1;
  }
}