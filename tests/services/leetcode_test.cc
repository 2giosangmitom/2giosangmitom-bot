#include "services/leetcode.hh"
#include <cstdio> // for std::remove
#include <fstream>
#include <gtest/gtest.h>
#include <nlohmann/json.hpp>

using namespace leetcode;
using nlohmann::json;

// Helper to create a minimal valid JSON for testing
json make_valid_json(int problem_count = 1) {
  json j;
  j["metadata"] = {{"lastUpdated", "2025-07-13 12:00:00"},
                   {"totalProblems", problem_count}};

  j["topics"] = {"Array", "Math"};

  j["problems"] = json::array();
  for (int i = 0; i < problem_count; ++i) {
    j["problems"].push_back(
        {{"id", i + 1},
         {"title", "Test Problem"},
         {"difficulty", "Easy"},
         {"url", "https://leetcode.com/problems/test-problem"},
         {"is_paid", false},
         {"ac_rate", 0.5},
         {"topics", {"Array"}}});
  }

  return j;
}

// Fixture for temporary data.json handling
class LeetCodeTest : public ::testing::Test {
protected:
  const char *filename = "data.json";

  void SetUp() override {
    // Make sure we start clean
    std::remove(filename);
  }

  void TearDown() override { std::remove(filename); }

  void write_json_to_file(const json &j) {
    std::ofstream out(filename);
    out << j.dump(2);
  }
};

TEST_F(LeetCodeTest, ValidateJsonWorksWithValidInput) {
  json valid = make_valid_json();
  EXPECT_TRUE(validate_json(valid));
}

TEST_F(LeetCodeTest, ValidateJsonFailsWithMissingFields) {
  json invalid = make_valid_json();
  invalid["metadata"].erase("lastUpdated");
  EXPECT_FALSE(validate_json(invalid));
}

TEST_F(LeetCodeTest, LoadDataJsonParsesCorrectly) {
  json j = make_valid_json(2);
  write_json_to_file(j);

  Data data = load_data_json();
  EXPECT_EQ(data.problems.size(), 2);
  EXPECT_EQ(data.metadata.totalProblems, 2);
  EXPECT_EQ(data.metadata.lastUpdated, "2025-07-13 12:00:00");
}

TEST_F(LeetCodeTest, LoadDataJsonThrowsOnInvalidJson) {
  std::ofstream out(filename);
  out << "{ invalid json ";
  out.close();

  EXPECT_THROW(load_data_json(), std::runtime_error);
}

TEST(LeetCodeFilterTest, FiltersByDifficulty) {
  std::vector<LeetCodeProblem> problems = {
      {1, "Easy", "Easy", {"Array"}, "url", false, 0.5},
      {2, "Hard", "Hard", {"Graph"}, "url", false, 0.2}};

  std::optional<std::vector<std::string>> diff =
      std::vector<std::string>{"Easy"};
  std::optional<std::vector<std::string>> topics = std::nullopt;

  auto result = filter_questions(problems, diff, topics);
  ASSERT_EQ(result.size(), 1);
  EXPECT_EQ(result[0].difficulty, "Easy");
}

TEST(LeetCodeFilterTest, FiltersByTopic) {
  std::vector<LeetCodeProblem> problems = {
      {1, "A", "Medium", {"Graph"}, "url", false, 0.4},
      {2, "B", "Medium", {"DP"}, "url", false, 0.6}};

  std::optional<std::vector<std::string>> diff = std::nullopt;
  std::optional<std::vector<std::string>> topics =
      std::vector<std::string>{"DP"};

  auto result = filter_questions(problems, diff, topics);
  ASSERT_EQ(result.size(), 1);
  EXPECT_EQ(result[0].topics[0], "DP");
}

TEST(LeetCodeGetQuestionsTest, ReturnsRequestedQuantity) {
  std::vector<LeetCodeProblem> problems;
  for (int i = 0; i < 5; ++i) {
    problems.push_back({i, "Title", "Easy", {"Array"}, "url", false, 0.1});
  }

  std::optional<int> quantity = 3;
  auto result = get_questions(problems, quantity);
  EXPECT_EQ(result.size(), 3);
}

TEST(LeetCodeGetQuestionsTest, CapsAt10Problems) {
  std::vector<LeetCodeProblem> problems;
  for (int i = 0; i < 50; ++i) {
    problems.push_back({i, "Title", "Easy", {"Array"}, "url", false, 0.1});
  }

  std::optional<int> quantity = 20;
  auto result = get_questions(problems, quantity);
  EXPECT_EQ(result.size(), 10);
}
