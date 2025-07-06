{
  description = "My Discord bot";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {inherit system;};
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
        clang
        bear
        dpp
        nlohmann_json
      ];
      DPP_ROOT_DIR = "${pkgs.dpp}";
      NLOHMANN_JSON_DIR = "${pkgs.nlohmann_json}";
    };
    formatter.${system} = pkgs.alejandra;
  };
}
