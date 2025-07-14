#pragma once

#include <string>
#include <vector>

namespace string_utils {

// Get current timestamp
std::string get_timestamp(const char *format = "%Y-%m-%d %H:%M:%S");

// Split string with separator
std::vector<std::string> split(const std::string &str, char delimiter);

} // namespace string_utils