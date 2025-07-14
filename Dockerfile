FROM nixos/nix:latest

ENV NIX_CONFIG="experimental-features = nix-command flakes"

WORKDIR /app
COPY . .

# Build the binary using flakes
RUN nix build

# Set correct binary as entrypoint
ENTRYPOINT ["./result/bin/2giosangmitom-bot"]
