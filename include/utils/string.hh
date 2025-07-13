#pragma once

#include <string>

namespace string_utils {

// Get current timestamp
std::string get_timestamp(const char *format = "%Y-%m-%d %H:%M:%S");

} // namespace string_utils