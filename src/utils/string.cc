#include "utils/string.hh"
#include <chrono>
#include <iomanip>

namespace string_utils {

std::string get_timestamp(const char *format) {
  auto now = std::chrono::system_clock::now();
  auto time_t = std::chrono::system_clock::to_time_t(now);
  auto tm = *std::gmtime(&time_t);

  std::ostringstream oss;
  oss << std::put_time(&tm, format);
  return oss.str();
}

} // namespace string_utils