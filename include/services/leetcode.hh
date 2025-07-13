#pragma once

#include <nlohmann/json.hpp>
#include <optional>
#include <set>
#include <string>
#include <vector>

namespace leetcode {

// Represents a single LeetCode problem record.
struct LeetCodeProblem {
  int id;                 // Unique identifier for the problem.
  std::string title;      // Full title of the problem.
  std::string difficulty; // Difficulty level ("Easy", "Medium", "Hard").
  std::vector<std::string>
      topics;      // List of topics/tags related to the problem.
  std::string url; // Web URL to the problem statement.
  bool is_paid;    // True if the problem is paid-only.
  double ac_rate;  // Acceptance rate as a percentage.
};

// Stores metadata and a collection of LeetCode problems.
struct Data {
  std::vector<LeetCodeProblem> problems; // List of all LeetCode problems.
  std::set<std::string> topics; // Set of all unique topics across problems.
  std::string lastUpdated;      // Timestamp of the last data update.
  int totalProblems;            // Total number of problems included.
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(LeetCodeProblem, id, title, difficulty,
                                   topics, url, is_paid, ac_rate);
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Data, problems, topics, lastUpdated,
                                   totalProblems);

// Downloads the latest data from the LeetCode GraphQL API and caches it
// to 'data.json'.
bool download_data();

// Validate the json data
bool validate_json(const nlohmann::json &json_data);

// Read data.json file
Data load_data_json();

// Filters LeetCode problems by difficulty and/or topics.
std::vector<LeetCodeProblem>
filter_questions(const std::optional<std::vector<std::string>> &difficulty,
                 const std::optional<std::vector<std::string>> &topics);

// Selects a random subset of LeetCode problems from a given collection.
std::vector<LeetCodeProblem>
get_questions(const std::vector<LeetCodeProblem> &problems,
              std::optional<int> quantity);

} // namespace leetcode