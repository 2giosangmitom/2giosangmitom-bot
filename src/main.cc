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

// Customized data model for LeetCode problem
struct LeetCodeProblem {
  int id;
  string title;
  string titleSlug;
  string difficulty;
  vector<string> topics;
  string url;
  bool isPaid;
  double acceptanceRate;
};

struct BotData {
  vector<LeetCodeProblem> problems;
  std::set<string> topics;
  string lastUpdated;
  int totalProblems;
};

// Data model for waifu.pics response
struct WaifuPicsRes {
  string url;
};

// JSON serialization for custom schema
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(LeetCodeProblem, id, title, titleSlug,
                                   difficulty, topics, url, isPaid,
                                   acceptanceRate);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(WaifuPicsRes, url);

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

// Utility class for string operations
class StringUtils {
public:
  // Convert a string to lowercase
  static string to_lower(const string &s) {
    string result = s;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
  }

  // Convert a string to titlecase
  static string to_title(const string &s) {
    if (s.empty())
      return s;
    string result = s;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    result[0] =
        static_cast<char>(std::toupper(static_cast<unsigned char>(result[0])));
    return result;
  }

  // Get current timestamp in YYYY-MM-DD HH:MM:SS format
  static string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::gmtime(&time_t);

    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
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

    const string lower_pattern = StringUtils::to_lower(pattern);
    const string lower_text = StringUtils::to_lower(text);

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

    // Calculate detailed score using dynamic programming
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

// Data manager class for LeetCode problems
class LeetCodeDataManager {
private:
  BotData data;

  static void spinner(std::atomic<bool> &running, const std::string &msg) {
    const char spinner_chars[] = {'|', '/', '-', '\\'};
    int i = 0;

    while (running.load()) {
      std::cout << "\r" << msg << " " << spinner_chars[i] << std::flush;
      i = (i + 1) % 4;
      std::this_thread::sleep_for(std::chrono::milliseconds(150));
    }

    std::cout << "\r" << msg << " ✓" << std::endl;
  }

  // Convert LeetCode API response to our custom format
  void processApiResponse(const nlohmann::json &apiResponse) {
    data.problems.clear();
    data.topics.clear();

    if (!apiResponse.contains("data") ||
        !apiResponse["data"].contains("problemsetQuestionListV2") ||
        !apiResponse["data"]["problemsetQuestionListV2"].contains(
            "questions")) {
      throw std::runtime_error("Invalid API response structure");
    }

    auto questions =
        apiResponse["data"]["problemsetQuestionListV2"]["questions"];

    for (const auto &q : questions) {
      LeetCodeProblem problem;

      // Map API fields to custom structure
      problem.id = q.value("id", 0);
      problem.title = q.value("title", "Unknown");
      problem.titleSlug = q.value("titleSlug", "");
      problem.difficulty = q.value("difficulty", "Unknown");
      problem.isPaid = q.value("paidOnly", false);
      problem.acceptanceRate = q.value("acRate", 0.0);
      problem.url = "https://leetcode.com/problems/" + problem.titleSlug + "/";

      // Extract topics from topicTags
      if (q.contains("topicTags") && q["topicTags"].is_array()) {
        for (const auto &tag : q["topicTags"]) {
          if (tag.contains("name")) {
            string topicName = tag["name"];
            problem.topics.push_back(topicName);
            data.topics.insert(topicName);
          }
        }
      }

      data.problems.push_back(problem);
    }

    data.totalProblems = static_cast<int>(data.problems.size());
    data.lastUpdated = StringUtils::getCurrentTimestamp();
  }

public:
  // Save data to custom JSON format
  void saveDataToJson() const {
    nlohmann::json jsonData;

    // Convert set to vector for JSON serialization
    vector<string> topicsVector(data.topics.begin(), data.topics.end());

    jsonData["metadata"] = {
        {"version", "1.0"},
        {"lastUpdated", data.lastUpdated},
        {"totalProblems", data.totalProblems},
        {"author", "2giosangmitom"},
        {"description", "Custom LeetCode problems dataset for Discord bot"}};

    jsonData["problems"] = data.problems;
    jsonData["topics"] = topicsVector;

    std::ofstream file("data.json");
    if (!file.is_open()) {
      throw std::runtime_error("Failed to create data.json");
    }

    file << jsonData.dump(2);
    file.close();

    std::cout << "✅ Data saved to data.json (" << data.problems.size()
              << " problems, " << data.topics.size() << " topics)" << std::endl;
  }

  // Load data from custom JSON format
  bool loadDataFromJson() {
    std::ifstream file("data.json");
    if (!file.is_open()) {
      return false;
    }

    try {
      nlohmann::json jsonData;
      file >> jsonData;
      file.close();

      // Validate custom schema
      if (!jsonData.contains("metadata") || !jsonData.contains("problems") ||
          !jsonData.contains("topics")) {
        std::cerr << "⚠️  Invalid data.json schema, will fetch fresh data"
                  << std::endl;
        return false;
      }

      // Load problems
      data.problems = jsonData["problems"].get<vector<LeetCodeProblem>>();

      // Load topics
      vector<string> topicsVector = jsonData["topics"].get<vector<string>>();
      data.topics = std::set<string>(topicsVector.begin(), topicsVector.end());

      // Load metadata
      auto metadata = jsonData["metadata"];
      data.lastUpdated = metadata.value("lastUpdated", "Unknown");
      data.totalProblems = metadata.value("totalProblems", 0);

      std::cout << "✅ Loaded " << data.problems.size() << " problems and "
                << data.topics.size() << " topics from data.json" << std::endl;
      std::cout << "📅 Last updated: " << data.lastUpdated << std::endl;

      return true;
    } catch (const std::exception &e) {
      std::cerr << "❌ Failed to parse data.json: " << e.what() << std::endl;
      return false;
    }
  }

  // Fetch data from LeetCode API
  void fetchDataFromApi(dpp::cluster &bot) {
    std::cout << "🔄 Fetching fresh data from LeetCode API..." << std::endl;

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
        {"limit", 3000},
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
                               "Fetching LeetCode data");

    bot.request(
        "https://leetcode.com/graphql", dpp::m_post,
        [this, &promise,
         &spinner_running](const dpp::http_request_completion_t &cc) mutable {
          try {
            spinner_running = false;

            if (cc.status != 200) {
              std::cerr << "❌ HTTP request failed with status: " << cc.status
                        << std::endl;
              promise.set_exception(std::make_exception_ptr(
                  std::runtime_error("HTTP request failed")));
              return;
            }

            nlohmann::json apiResponse = nlohmann::json::parse(cc.body);
            processApiResponse(apiResponse);
            saveDataToJson();

            std::cout << "🎉 Successfully fetched and processed "
                      << data.problems.size() << " problems!" << std::endl;
            promise.set_value();
          } catch (const std::exception &e) {
            std::cerr << "❌ Error processing API response: " << e.what()
                      << std::endl;
            promise.set_exception(std::current_exception());
          }
        },
        post_data_str, "application/json");

    try {
      future.get();
    } catch (const std::exception &e) {
      spinner_thread.join();
      throw;
    }
    spinner_thread.join();
  }

  // Initialize data (load from file or fetch from API)
  void initializeData(dpp::cluster &bot) {
    if (!loadDataFromJson()) {
      fetchDataFromApi(bot);
    }
  }

  // Filter problems based on difficulty and topic
  vector<LeetCodeProblem>
  filterProblems(const std::optional<string> &difficulty,
                 const std::optional<string> &topic) const {
    vector<LeetCodeProblem> filtered;
    filtered.reserve(data.problems.size());

    for (const auto &problem : data.problems) {
      if (problem.isPaid)
        continue;

      if (difficulty.has_value()) {
        const string lower_difficulty =
            StringUtils::to_lower(difficulty.value());
        const string lower_problem_difficulty =
            StringUtils::to_lower(problem.difficulty);

        bool difficulty_matches = false;
        if (lower_difficulty == "easy to medium") {
          difficulty_matches = (lower_problem_difficulty == "easy" ||
                                lower_problem_difficulty == "medium");
        } else if (lower_difficulty == "easy to hard") {
          difficulty_matches = true;
        } else if (lower_difficulty == "medium to hard") {
          difficulty_matches = (lower_problem_difficulty == "medium" ||
                                lower_problem_difficulty == "hard");
        } else {
          difficulty_matches = (lower_problem_difficulty == lower_difficulty);
        }

        if (!difficulty_matches)
          continue;
      }

      if (topic.has_value()) {
        const string lower_topic = StringUtils::to_lower(topic.value());
        bool has_topic =
            std::any_of(problem.topics.begin(), problem.topics.end(),
                        [&lower_topic](const string &t) {
                          return StringUtils::to_lower(t) == lower_topic;
                        });

        if (!has_topic)
          continue;
      }

      filtered.push_back(problem);
    }

    return filtered;
  }

  // Pick random problems from a filtered list
  vector<LeetCodeProblem>
  pickRandomProblems(const vector<LeetCodeProblem> &problems,
                     int quantity) const {
    if (problems.empty()) {
      throw std::runtime_error("No matching free problems found.");
    }

    if (quantity <= 0) {
      throw std::invalid_argument("Quantity must be positive");
    }

    vector<LeetCodeProblem> result;
    std::random_device rd;
    std::mt19937 gen(rd());

    if (quantity >= static_cast<int>(problems.size())) {
      result = problems;
    } else {
      vector<size_t> indices(problems.size());
      std::iota(indices.begin(), indices.end(), 0);
      std::shuffle(indices.begin(), indices.end(), gen);

      result.reserve(quantity);
      for (int i = 0; i < quantity; ++i) {
        result.push_back(problems[indices[i]]);
      }
    }
    return result;
  }

  const std::set<string> &getTopics() const { return data.topics; }
  const BotData &getData() const { return data; }

  // Refresh data (delete cache and fetch fresh)
  void refreshData(dpp::cluster &bot) {
    if (std::filesystem::exists("data.json")) {
      if (std::filesystem::remove("data.json")) {
        std::cout << "🗑️  Deleted old data.json for refresh" << std::endl;
      }
    }
    fetchDataFromApi(bot);
  }
};

// Main Discord bot class
class DiscordBot {
private:
  dpp::cluster bot;
  LeetCodeDataManager dataManager;
  const vector<string> image_categories = {"waifu", "hug",      "kiss",
                                           "happy", "handhold", "bite"};

  // Load Discord Bot token from "token.txt"
  string getToken() const {
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

  void setupEventHandlers() {
    bot.on_log(dpp::utility::cout_logger());

    // Slash command handler
    bot.on_slashcommand([this](const dpp::slashcommand_t &event) {
      handleSlashCommand(event);
    });

    // Autocomplete handler
    bot.on_autocomplete([this](const dpp::autocomplete_t &event) {
      handleAutocomplete(event);
    });

    // Ready event handler
    bot.on_ready([this](const dpp::ready_t &event) { handleReady(event); });
  }

  void handleSlashCommand(const dpp::slashcommand_t &event) {
    const auto command_name = event.command.get_command_name();

    if (command_name == "leetcode") {
      handleLeetCodeCommand(event);
    } else if (command_name == "waifu") {
      handleWaifuCommand(event);
    }
  }

  void handleLeetCodeCommand(const dpp::slashcommand_t &event) {
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
        quantity = std::clamp(quantity, 1, 10);
      }

      const auto filtered = dataManager.filterProblems(difficulty, topic);
      const auto random_problems =
          dataManager.pickRandomProblems(filtered, quantity);

      std::ostringstream desc;
      for (size_t i = 0; i < random_problems.size(); ++i) {
        const auto &problem = random_problems[i];
        const string difficulty_str = StringUtils::to_title(problem.difficulty);

        string topic_list;
        if (!problem.topics.empty()) {
          topic_list = problem.topics[0];
          for (size_t j = 1; j < problem.topics.size(); ++j) {
            topic_list += ", " + problem.topics[j];
          }
        } else {
          topic_list = "No topics";
        }

        desc << std::format(
            "**{}. {}**🔗 [Solve it here]({})\n📊 Difficulty: **{}**\n🏷️ "
            "Topics: `{}`\n📈 Acceptance: **{:.1f}%**\n",
            i + 1, problem.title, problem.url, difficulty_str, topic_list,
            problem.acceptanceRate);

        if (problem.isPaid) {
          desc << "💎 **Premium Problem**\n";
        }
        desc << "\n";
      }

      desc << format(
          "🧩 Total: {} question(s) found from {} available problems",
          random_problems.size(), filtered.size());

      dpp::embed embed =
          dpp::embed()
              .set_color(dpp::colors::green)
              .set_title("🧩 Random LeetCode Problems")
              .set_description(desc.str())
              .set_footer(dpp::embed_footer().set_text(
                  format("Powered by 2giosangmitom Bot • Last updated: {}",
                         dataManager.getData().lastUpdated)))
              .set_timestamp(time(0));

      event.reply(dpp::message(event.command.channel_id, embed));
    } catch (const std::exception &e) {
      event.reply(format("❌ Error: {}", e.what()));
    }
  }

  void handleWaifuCommand(const dpp::slashcommand_t &event) {
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
          std::uniform_int_distribution<> dist(0, image_categories.size() - 1);
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
                    "❌ Failed to fetch image. Please try again."));
                return;
              }

              const nlohmann::json res = nlohmann::json::parse(cc.body);
              const WaifuPicsRes waifu_res = res.get<WaifuPicsRes>();

              if (waifu_res.url.empty()) {
                event.edit_original_response(
                    dpp::message("❌ Received empty image URL."));
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

              dpp::embed embed = dpp::embed()
                                     .set_color(dpp::colors::pink)
                                     .set_title(random_title)
                                     .set_description(format("_Category: {}_",
                                                             category.value()))
                                     .set_image(waifu_res.url)
                                     .set_footer(dpp::embed_footer().set_text(
                                         "Powered by 2giosangmitom Bot"))
                                     .set_timestamp(time(0));

              event.edit_original_response(
                  dpp::message(event.command.channel_id, embed));
            } catch (const std::exception &e) {
              event.edit_original_response(dpp::message(
                  format("❌ Error processing image: {}", e.what())));
            }
          });
    } catch (const std::exception &e) {
      event.reply(format("❌ Error: {}", e.what()));
    }
  }

  void handleAutocomplete(const dpp::autocomplete_t &event) {
    for (const auto &opt : event.options) {
      if (!std::holds_alternative<string>(opt.value))
        continue;

      const string query = std::get<string>(opt.value);

      if (opt.focused && opt.name == "difficulty") {
        handleDifficultyAutocomplete(event, query);
        break;
      } else if (opt.focused && opt.name == "topic") {
        handleTopicAutocomplete(event, query);
        break;
      } else if (opt.focused && opt.name == "category") {
        handleCategoryAutocomplete(event, query);
        break;
      }
    }
  }

  void handleDifficultyAutocomplete(const dpp::autocomplete_t &event,
                                    const string &query) {
    dpp::interaction_response res(dpp::ir_autocomplete_reply);
    const vector<string> difficulties{"Easy",         "Medium",
                                      "Hard",         "Easy to Medium",
                                      "Easy to Hard", "Medium to Hard"};

    if (query.empty()) {
      for (const auto &d : difficulties) {
        res.add_autocomplete_choice(dpp::command_option_choice(d, d));
      }
    } else {
      auto matches = FuzzyMatcher::fuzzy_search(query, difficulties, 6);
      for (const auto &match : matches) {
        res.add_autocomplete_choice(
            dpp::command_option_choice(match.value, match.value));
      }
    }

    bot.interaction_response_create(event.command.id, event.command.token, res);
  }

  void handleTopicAutocomplete(const dpp::autocomplete_t &event,
                               const string &query) {
    dpp::interaction_response res(dpp::ir_autocomplete_reply);
    const auto &topic_set = dataManager.getTopics();
    vector<string> topics(topic_set.begin(), topic_set.end());

    if (query.empty()) {
      std::sort(topics.begin(), topics.end());
      size_t limit = std::min(static_cast<size_t>(25), topics.size());
      for (size_t i = 0; i < limit; ++i) {
        res.add_autocomplete_choice(
            dpp::command_option_choice(topics[i], topics[i]));
      }
    } else {
      auto matches = FuzzyMatcher::fuzzy_search(query, topics, 25);
      for (const auto &match : matches) {
        res.add_autocomplete_choice(
            dpp::command_option_choice(match.value, match.value));
      }
    }

    bot.interaction_response_create(event.command.id, event.command.token, res);
  }

  void handleCategoryAutocomplete(const dpp::autocomplete_t &event,
                                  const string &query) {
    dpp::interaction_response res(dpp::ir_autocomplete_reply);

    if (query.empty()) {
      for (const auto &category_name : image_categories) {
        res.add_autocomplete_choice(
            dpp::command_option_choice(category_name, category_name));
      }
    } else {
      auto matches = FuzzyMatcher::fuzzy_search(query, image_categories, 5);
      for (const auto &match : matches) {
        res.add_autocomplete_choice(
            dpp::command_option_choice(match.value, match.value));
      }
    }

    bot.interaction_response_create(event.command.id, event.command.token, res);
  }

  void handleReady(const dpp::ready_t &event) {
    if (dpp::run_once<struct update_data>()) {
      setupDataRefresh();
    }

    if (dpp::run_once<struct register_bot_commands>()) {
      registerCommands();
    }
  }

  void setupDataRefresh() {
    // Initial data load
    try {
      dataManager.initializeData(bot);
    } catch (const std::exception &e) {
      std::cerr << "❌ Failed to initialize data: " << e.what() << std::endl;
    }

    // Setup daily refresh (86400 seconds = 24 hours)
    auto update_data = [this](auto) {
      try {
        std::cout << "🔄 Daily data refresh started..." << std::endl;
        dataManager.refreshData(bot);
        std::cout << "✅ Daily data refresh completed!" << std::endl;
      } catch (const std::exception &e) {
        std::cerr << "❌ Failed to refresh data: " << e.what() << std::endl;
      }
    };

    bot.start_timer(update_data, 86400);
  }

  void registerCommands() {
    dpp::slashcommand leetcode(
        "leetcode", "Get random LeetCode problems with advanced filtering",
        bot.me.id);
    leetcode.add_option(dpp::command_option(dpp::co_string, "difficulty",
                                            "Problem difficulty", false)
                            .set_auto_complete(true));
    leetcode.add_option(
        dpp::command_option(dpp::co_string, "topic", "Problem topic", false)
            .set_auto_complete(true));
    leetcode.add_option(dpp::command_option(
        dpp::co_number, "quantity", "Number of problems (1-10)", false));

    dpp::slashcommand waifu(
        "waifu", "Get random SFW anime images for motivation", bot.me.id);
    waifu.add_option(
        dpp::command_option(dpp::co_string, "category", "Image category", false)
            .set_auto_complete(true));

    bot.global_bulk_command_create({leetcode, waifu});
  }

public:
  DiscordBot() : bot(getToken()) { setupEventHandlers(); }

  void start() { bot.start(dpp::st_wait); }
};

int main() {
  try {
    DiscordBot bot;
    std::cout << "🚀 Starting 2giosangmitom's Advanced LeetCode Discord Bot..."
              << std::endl;
    bot.start();
  } catch (const std::exception &e) {
    println(stderr, "💥 Fatal error: {}", e.what());
    return 1;
  }
}