#include "utils/string.hh"
#include <gtest/gtest.h>

using string_utils::split;

TEST(SplitTest, BasicSplit) {
  auto parts = split("a,b,c", ',');
  ASSERT_EQ(parts.size(), 3);
  EXPECT_EQ(parts[0], "a");
  EXPECT_EQ(parts[1], "b");
  EXPECT_EQ(parts[2], "c");
}

TEST(SplitTest, EmptyInput) {
  auto parts = split("", ',');
  ASSERT_EQ(parts.size(), 1);
  EXPECT_EQ(parts[0], "");
}

TEST(SplitTest, NoDelimiter) {
  auto parts = split("abc", ',');
  ASSERT_EQ(parts.size(), 1);
  EXPECT_EQ(parts[0], "abc");
}

TEST(SplitTest, TrailingDelimiter) {
  auto parts = split("a,b,c,", ',');
  std::vector<std::string> expected{"a", "b", "c", ""};
  ASSERT_EQ(parts.size(), 4);
  EXPECT_EQ(parts, expected);
}

TEST(SplitTest, LeadingDelimiter) {
  auto parts = split(",a,b,c", ',');
  ASSERT_EQ(parts.size(), 4);
  EXPECT_EQ(parts[0], "");
}

TEST(SplitTest, ConsecutiveDelimiters) {
  auto parts = split("a,,b,,,c", ',');
  ASSERT_EQ(parts.size(), 6);
  EXPECT_EQ(parts[0], "a");
  EXPECT_EQ(parts[1], "");
  EXPECT_EQ(parts[2], "b");
  EXPECT_EQ(parts[3], "");
  EXPECT_EQ(parts[4], "");
  EXPECT_EQ(parts[5], "c");
}
