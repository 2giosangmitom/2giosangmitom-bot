{
  description = "A simple Discord bot that fetches random LeetCode questions";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {inherit system;};
    lib = nixpkgs.lib;
  in {
    devShells.${system}.default = pkgs.mkShell.override {stdenv = pkgs.clangStdenv;} {
      packages = [
        pkgs.dpp
        pkgs.nlohmann_json
        pkgs.curl
        pkgs.spdlog
        pkgs.fmt
        pkgs.gtest

        pkgs.gnumake
        pkgs.bear
      ];

      CPATH = builtins.concatStringsSep ":" [
        (lib.makeSearchPathOutput "dev" "include" [pkgs.curl pkgs.spdlog pkgs.fmt pkgs.gtest])
        (lib.makeSearchPath "resource-root/include" [pkgs.clang])
        (lib.makeSearchPath "include" [pkgs.dpp pkgs.nlohmann_json])
      ];
    };
    packages.${system} = {
      default = pkgs.callPackage ./package.nix {stdenv = pkgs.clangStdenv;};
    };
    formatter.${system} = pkgs.alejandra;
  };
}
