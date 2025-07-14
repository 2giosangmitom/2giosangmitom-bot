#include "utils/random.hh"
#include <gtest/gtest.h>

TEST(RandomUtilsTest, GeneratesNumberInRange) {
  int a = 1, b = 5;
  for (int i = 0; i < 100; ++i) {
    int result = random_utils::random_int_range(a, b);
    EXPECT_GE(result, a);
    EXPECT_LE(result, b);
  }
}

TEST(RandomUtilsTest, UniformityRoughlyPreserved) {
  const int a = 1, b = 3;
  const int trials = 10000;
  std::map<int, int> count;

  for (int i = 0; i < trials; ++i) {
    int num = random_utils::random_int_range(a, b);
    count[num]++;
  }

  for (int val = a; val <= b; ++val) {
    EXPECT_GT(count[val], 0); // Every value should appear at least once
  }
}
