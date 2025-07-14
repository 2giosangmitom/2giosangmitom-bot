#pragma once

#include <random>

namespace random_utils {

// Generate a random number in range [a, b]
template <typename T> T random_int_range(T a, T b) {
  static std::random_device rd;
  static std::mt19937 gen(rd());
  std::uniform_int_distribution<> distrib(a, b);
  return distrib(gen);
};

} // namespace random_utils