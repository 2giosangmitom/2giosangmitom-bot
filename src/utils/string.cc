#include "utils/string.hh"
#include <fmt/chrono.h>
#include <fmt/format.h>

namespace string_utils {

std::string get_timestamp(const char *format) {
  std::time_t t = std::time(nullptr);
  return fmt::format("{:" + std::string(format) + "}", fmt::localtime(t));
}

std::vector<std::string> split(const std::string &str, char delimiter) {
  std::vector<std::string> result;
  size_t start = 0;
  size_t end;

  while ((end = str.find(delimiter, start)) != std::string::npos) {
    result.push_back(str.substr(start, end - start));
    start = end + 1;
  }

  // Always push the remaining part, even if empty
  result.push_back(str.substr(start));
  return result;
}

} // namespace string_utils