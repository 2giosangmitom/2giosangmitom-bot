DPP_ROOT = ${DPP_ROOT_DIR}
NLOHMANN_JSON_ROOT = ${NLOHMANN_JSON_DIR}
CXXFLAGS := -std=c++23 -I$(DPP_ROOT)/include -I$(NLOHMANN_JSON_ROOT)/include
LDFLAGS := -L$(DPP_ROOT)/lib -ldpp
CXX := clang++

# Output
TARGET := 2giosangmitom-bot
SRC := src/main.cc
BUILD_DIR := build

# Default target
all: $(BUILD_DIR)/$(TARGET)

$(BUILD_DIR)/$(TARGET): $(SRC)
	mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(SRC) -o $@ $(LDFLAGS)

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean
