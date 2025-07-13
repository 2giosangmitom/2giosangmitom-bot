#include "services/leetcode.hh"
#include "utils/string.hh"
#include <cerrno>
#include <cstring>
#include <curl/curl.h>
#include <fstream>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include <sstream>
#include <stdexcept>
#include <string>

// Constants
static constexpr const char *leetcode_api_url = "https://leetcode.com/graphql";
static constexpr const char *output_file = "data.json";

// Helper function for libcurl to write received data into a std::ostream
size_t write_cb(void *contents, size_t size, size_t nmemb, void *userp) {
  std::ostream *stream = static_cast<std::ostream *>(userp);
  size_t realsize = size * nmemb;
  stream->write(static_cast<char *>(contents), realsize);
  return realsize;
}

// Helper function for building payload data
nlohmann::json build_graphql_payload() {
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

  return {
      {"query", query},
      {"variables",
       {
           {"skip", 0},
           {"limit", 10000},
           {"categorySlug", "all-code-essentials"},
           {"filters", {{"filterCombineType", "ALL"}}},
       }},
  };
}

// Helper function for caching API response to "data.json"
bool write_json_to_file(const nlohmann::json &json) {
  std::ofstream out(output_file, std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    spdlog::critical("Failed to open '{}' for writing: {}", output_file,
                     strerror(errno));
    return false;
  }

  out << json.dump(2) << std::endl;
  if (!out) {
    spdlog::critical("Failed to write to '{}': {}", output_file,
                     strerror(errno));
    return false;
  }

  return true;
}

bool leetcode::validate_json(const nlohmann::json &json_data) {
  // Check if "metadata" exists and is an object
  const auto meta_it = json_data.find("metadata");
  if (meta_it == json_data.end() || !meta_it->is_object()) {
    return false;
  }

  // Check required metadata fields
  if (!meta_it->contains("lastUpdated") || !meta_it->contains("totalProblems"))
    return false;
  if (!(*meta_it)["lastUpdated"].is_string() ||
      !(*meta_it)["totalProblems"].is_number())
    return false;

  // Check "problems" is present and is an array
  const auto problems_it = json_data.find("problems");
  if (problems_it == json_data.end() || !problems_it->is_array())
    return false;

  // Check each problem has required structure
  for (const auto &problem : *problems_it) {
    if (!problem.contains("id") || !problem["id"].is_number())
      return false;
    if (!problem.contains("title") || !problem["title"].is_string())
      return false;
    if (!problem.contains("difficulty") || !problem["difficulty"].is_string())
      return false;
    if (!problem.contains("url") || !problem["url"].is_string())
      return false;
    if (!problem.contains("is_paid") || !problem["is_paid"].is_boolean())
      return false;
    if (!problem.contains("ac_rate") || !problem["ac_rate"].is_number())
      return false;
    if (!problem.contains("topics") || !problem["topics"].is_array())
      return false;
  }

  // Check "topics" array exists and is an array
  if (json_data.contains("topics") && !json_data["topics"].is_array())
    return false;

  return true;
}

bool leetcode::download_data() {
  spdlog::info("Preparing LeetCode GraphQL request...");

  auto payload = build_graphql_payload();
  const std::string graphql_payload = payload.dump();

  CURL *handle = curl_easy_init();
  if (!handle) {
    spdlog::critical("Failed to initialize curl handle.");
    return false;
  }

  curl_slist *headers = nullptr;
  headers = curl_slist_append(headers, "Content-Type: application/json");

  std::stringstream response;
  curl_easy_setopt(handle, CURLOPT_URL, leetcode_api_url);
  curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(handle, CURLOPT_POSTFIELDS, graphql_payload.c_str());
  curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, graphql_payload.size());
  curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, write_cb);
  curl_easy_setopt(handle, CURLOPT_WRITEDATA, &response);

  spdlog::info("Sending request to LeetCode API...");
  CURLcode res = curl_easy_perform(handle);
  curl_slist_free_all(headers);
  curl_easy_cleanup(handle);

  if (res != CURLE_OK) {
    spdlog::critical("curl_easy_perform failed: {}", curl_easy_strerror(res));
    return false;
  }

  nlohmann::json json_response;
  try {
    json_response = nlohmann::json::parse(response.str());
  } catch (const std::exception &e) {
    spdlog::critical("Failed to parse LeetCode response JSON: {}", e.what());
    return false;
  }

  auto &questions =
      json_response["data"]["problemsetQuestionListV2"]["questions"];
  if (!questions.is_array()) {
    spdlog::critical("Unexpected structure in response.");
    return false;
  }

  spdlog::info("Parsed {} problems.", questions.size());

  // Convert to internal format
  Data data;
  for (const auto &q : questions) {
    LeetCodeProblem problem;
    problem.id = q.value("id", 0);
    problem.title = q.value("title", "Unknown");
    problem.difficulty = q.value("difficulty", "Unknown");
    problem.is_paid = q.value("paidOnly", false);
    problem.ac_rate = q.value("acRate", 0.0);
    problem.url =
        "https://leetcode.com/problems/" + q.value("titleSlug", "") + "/";

    for (const auto &tag : q["topicTags"]) {
      if (tag.contains("name")) {
        std::string topic = tag["name"];
        problem.topics.push_back(topic);
        data.topics.insert(topic);
      }
    }

    data.problems.push_back(std::move(problem));
  }

  data.metadata.totalProblems = data.problems.size();
  data.metadata.lastUpdated = string_utils::get_timestamp("%d %B");

  nlohmann::json final_json = {
      {"metadata",
       {
           {"lastUpdated", data.metadata.lastUpdated},
           {"totalProblems", data.metadata.totalProblems},
       }},
      {"problems", data.problems},
      {"topics", data.topics},
  };

  if (!write_json_to_file(final_json)) {
    return false;
  }

  spdlog::info("LeetCode data written to '{}'.", output_file);
  return true;
}

leetcode::Data leetcode::load_data_json() {
  std::ifstream in(output_file);
  if (!in.is_open()) {
    throw std::runtime_error(
        fmt::format("Failed to open data.json: {}", strerror(errno)));
  }

  nlohmann::json data_json;

  try {
    in >> data_json;
  } catch (const nlohmann::json::parse_error &e) {
    throw std::runtime_error(
        fmt::format("Failed to parse data.json: {}", e.what()));
  }

  if (!validate_json(data_json)) {
    throw std::runtime_error("Invalid format for \"data.json\"");
  }

  return data_json.get<leetcode::Data>();
}
