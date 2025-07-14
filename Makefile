# Compiler and flags
CXX := c++
CXXFLAGS := -std=c++17 -Wall -Wextra -I./include
LDFLAGS := -lcurl -lfmt -lspdlog -ldpp

# Debug flags
DEBUG_CXXFLAGS := -g -fsanitize=address
DEBUG_LDFLAGS := -fsanitize=address

# Directories and files
SRC_DIR := src
BUILD_DIR := build
TEST_DIR := tests
OBJ_DIR := $(BUILD_DIR)
TARGET := $(BUILD_DIR)/2giosangmitom-bot
TEST_TARGET := $(BUILD_DIR)/run_tests

SRC := $(wildcard $(SRC_DIR)/**/*.cc) $(wildcard $(SRC_DIR)/*.cc)
TEST_SRC := $(wildcard $(TEST_DIR)/**/*.cc) $(wildcard $(TEST_DIR)/*.cc)

OBJ := $(patsubst $(SRC_DIR)/%.cc,$(OBJ_DIR)/%.o,$(SRC))
TEST_OBJ := $(patsubst $(TEST_DIR)/%.cc,$(OBJ_DIR)/tests/%.o,$(TEST_SRC))

# Exclude src/main.cc from test build
MAIN_OBJ := $(OBJ_DIR)/main.o
OBJ_NO_MAIN := $(filter-out $(OBJ_DIR)/main.o,$(OBJ))

# Default build
all: $(TARGET)

# Debug build
debug: CXXFLAGS += $(DEBUG_CXXFLAGS)
debug: LDFLAGS += $(DEBUG_LDFLAGS)
debug: $(TARGET)

# Bot binary
$(TARGET): $(OBJ)
	@mkdir -p $(dir $@)
	$(CXX) $^ -o $@ $(LDFLAGS)

# Test binary
test: $(TEST_TARGET)

$(TEST_TARGET): $(OBJ_NO_MAIN) $(TEST_OBJ)
	@mkdir -p $(dir $@)
	$(CXX) $^ -o $@ $(LDFLAGS) -lgtest -lgtest_main -pthread

# Compile source files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cc
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Compile test files
$(OBJ_DIR)/tests/%.o: $(TEST_DIR)/%.cc
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean debug test
