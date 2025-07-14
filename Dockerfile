FROM nixos/nix:latest

ENV NIX_CONFIG="experimental-features = nix-command flakes"

WORKDIR /app
COPY . .

# Build C++ code
RUN nix build

# Install Node.js
RUN nix-env -iA nixpkgs.nodejs

EXPOSE 8080

CMD node fake-server.cjs & ./result/bin/2giosangmitom-bot