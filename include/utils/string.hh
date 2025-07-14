#pragma once

#include <string>
#include <vector>

namespace string_utils {

// Get current timestamp
std::string get_timestamp(const char *format = "%Y-%m-%d %H:%M:%S");

// Split string with separator
std::vector<std::string> split(const std::string &str, char delimiter);

// Convert a string to title case
std::string to_title(const std::string &str);

// Join a vector to string
std::string join(const std::vector<std::string> &values, const std::string &delimiter);

} // namespace string_utils