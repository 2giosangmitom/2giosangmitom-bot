#include "services/leetcode.hh"
#include <cerrno>
#include <cstring>
#include <curl/curl.h>
#include <fstream>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include <sstream>
#include <string>

// Helper function for libcurl to write received data into a std::ostream
size_t write_cb(void *contents, size_t size, size_t nmemb, void *userdata) {
  std::ostream *stream = static_cast<std::ostream *>(userdata);
  size_t realsize = size * nmemb;
  stream->write(static_cast<char *>(contents), realsize);
  return realsize;
}

std::string getCurrentTimestamp() {
  auto now = std::chrono::system_clock::now();
  auto time_t = std::chrono::system_clock::to_time_t(now);
  auto tm = *std::gmtime(&time_t);

  std::ostringstream oss;
  oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
  return oss.str();
}

bool leetcode::download_data() {
  static constexpr const char *url = "https://leetcode.com/graphql";
  static constexpr const char *output_file = "data.json";

  // Prepare GraphQL query and variables
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

  nlohmann::json payload;
  payload["query"] = query;
  payload["variables"] = {
      {"skip", 0},
      {"limit", 3000},
      {"categorySlug", "all-code-essentials"},
      {"filters", nlohmann::json::object({{"filterCombineType", "ALL"}})}};

  std::string graphql_payload = payload.dump();

  spdlog::info("Initializing curl handle for LeetCode data download...");
  CURL *handle = curl_easy_init();
  if (!handle) {
    spdlog::critical("Failed to initialize curl handle.");
    return false;
  }
  spdlog::debug("Curl handle initialized successfully.");

  std::stringstream response_stream;
  curl_slist *headers = nullptr;
  headers = curl_slist_append(headers, "Content-Type: application/json");

  curl_easy_setopt(handle, CURLOPT_URL, url);
  curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(handle, CURLOPT_POSTFIELDS, graphql_payload.c_str());
  curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, graphql_payload.size());
  curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, write_cb);
  curl_easy_setopt(handle, CURLOPT_WRITEDATA, &response_stream);

  spdlog::info("Sending request to LeetCode API...");
  CURLcode res = curl_easy_perform(handle);

  curl_slist_free_all(headers);
  curl_easy_cleanup(handle);

  if (res != CURLE_OK) {
    spdlog::critical("curl_easy_perform failed: {}", curl_easy_strerror(res));
    return false;
  }
  spdlog::info("Received response from LeetCode API successfully.");

  std::string res_body = response_stream.str();

  spdlog::info("Parsing API response into JSON...");
  nlohmann::json res_json;
  try {
    res_json = nlohmann::json::parse(res_body);
  } catch (const std::exception &e) {
    spdlog::critical("Failed to parse LeetCode API response: {}", e.what());
    return false;
  }

  if (!res_json.contains("data") ||
      !res_json["data"].contains("problemsetQuestionListV2") ||
      !res_json["data"]["problemsetQuestionListV2"].contains("questions")) {
    spdlog::critical("Unexpected LeetCode API response structure.");
    return false;
  }

  nlohmann::json questions =
      res_json["data"]["problemsetQuestionListV2"]["questions"];
  spdlog::info("Extracted {} problems from LeetCode API response.",
               questions.size());

  // Write the response to data.json
  std::ofstream outfile(output_file, std::ios::out | std::ios::trunc);
  if (!outfile) {
    spdlog::critical("Failed to open '{}' for writing: {}", output_file,
                     strerror(errno));
    return false;
  }

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

    // Extract topics from topicTags
    if (q.contains("topicTags") && q["topicTags"].is_array()) {
      for (const auto &tag : q["topicTags"]) {
        if (tag.contains("name")) {
          std::string topicName = tag["name"];
          problem.topics.push_back(topicName);
          data.topics.insert(topicName);
        }
      }
    }
    data.problems.push_back(problem);
  }
  data.totalProblems =
      res_json["data"]["problemsetQuestionListV2"].value("totalLength", 0);
  data.lastUpdated = getCurrentTimestamp();

  nlohmann::json jsonData;
  std::vector<std::string> topics(data.topics.begin(), data.topics.end());
  jsonData["metadata"] = {
      {"lastUpdated", data.lastUpdated},
      {"totalProblems", data.totalProblems},
  };
  jsonData["problems"] = data.problems;
  jsonData["topics"] = topics;

  outfile << jsonData.dump(2) << std::endl; // Pretty print JSON
  if (!outfile) {
    spdlog::critical("Failed to write to '{}': {}", output_file,
                     strerror(errno));
    return false;
  }
  outfile.close();

  spdlog::info("LeetCode data successfully written to '{}'.", output_file);

  return true;
}