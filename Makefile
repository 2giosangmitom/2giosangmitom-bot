# Compiler and flags
CXX := c++
CXXFLAGS := -std=c++17 -Wall -Wextra -I./include
LDFLAGS := -lcurl -lfmt -lspdlog -ldpp

# Debug flags
DEBUG_CXXFLAGS := -g -fsanitize=address
DEBUG_LDFLAGS := -fsanitize=address

# Targets and directories
TARGET := 2giosangmitom-bot
BUILD_DIR := build
SRC := src/main.cc src/services/leetcode.cc src/services/waifu.cc
OBJ := $(patsubst src/%.cc,$(BUILD_DIR)/%.o,$(SRC))

# Default target
all: $(BUILD_DIR)/$(TARGET)

# Debug target
debug: CXXFLAGS += $(DEBUG_CXXFLAGS)
debug: LDFLAGS += $(DEBUG_LDFLAGS)
debug: $(BUILD_DIR)/$(TARGET)

# Link target from object files
$(BUILD_DIR)/$(TARGET): $(OBJ)
	@mkdir -p $(dir $@)
	$(CXX) $^ -o $@ $(LDFLAGS)

# Compile each .cc to .o
$(BUILD_DIR)/%.o: src/%.cc
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean debug