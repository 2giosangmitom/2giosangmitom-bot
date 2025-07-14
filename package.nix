{
  lib,
  stdenv,
  dpp,
  nlohmann_json,
  curl,
  spdlog,
  fmt,
  boost,
  gnumake,
}:
stdenv.mkDerivation {
  name = "2giosangmitom-bot";

  src = lib.sourceByRegex ./. [
    "^include.*"
    "^src.*"
    "Makefile"
  ];

  nativeBuildInputs = [gnumake];
  buildInputs = [dpp nlohmann_json curl spdlog fmt boost];

  installPhase = ''
    mkdir -p $out/bin
    cp build/2giosangmitom-bot $out/bin/
  '';
}
