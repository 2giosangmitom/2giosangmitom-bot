#include "utils/string.hh"
#include <cctype>
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

std::string to_title(const std::string &str) {
  if (str.empty()) {
    return str;
  }

  std::string res;
  res += std::toupper(str[0]);
  auto n = str.size();

  for (size_t i = 1; i < n; i++) {
    res += std::tolower(str[i]);
  }

  return res;
}

std::string join(const std::vector<std::string> &values,
                 const std::string &delimiter) {
  if (values.empty()) {
    return "";
  }

  std::string res = values[0];
  size_t n = values.size();

  for (size_t i = 1; i < n; i++) {
    res += delimiter + values[i];
  }

  return res;
}

} // namespace string_utils