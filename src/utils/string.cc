#include "utils/string.hh"
#include <fmt/chrono.h>
#include <fmt/format.h>

namespace string_utils {

std::string get_timestamp(const char *format) {
  std::time_t t = std::time(nullptr);
  return fmt::format("{:" + std::string(format) + "}", fmt::localtime(t));
}

} // namespace string_utils