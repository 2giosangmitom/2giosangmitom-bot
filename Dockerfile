FROM nixos/nix:latest

ENV NIX_CONFIG="experimental-features = nix-command flakes"

WORKDIR /app
COPY . .

# Build C++ code
RUN nix build

EXPOSE 8080

ENTRYPOINT [ "./result/bin/2giosangmitom-bot" ]