#!/bin/bash

build_autocheckout(){
  arch=$(uname -m)
  platform_option=""
  if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
    platform_option="--platform linux/x86_64"
  fi
  docker build $platform_option -t autocheck_ext:latest ./autocheckout

}

start_auto_checkout(){
  
  local domain=$1
  local volume=$2
  local core=$3

  arch=$(uname -m)
  platform_option=""
  if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
    platform_option="--platform linux/x86_64"
  fi
  cpu_increment=${SCAMAGNIFIER_AC_CPU:-3}  

  let "cpu_end=core+1"

  docker run --rm $platform_option\
      --network app-network-scamagnifier-extension \
      -v "$SCAMAGNIFIER_EXT_V_DATA":/app/data \
      -e SELENIUM_ADDRESS="$SELENIUM_ADDRESS" \
      -e TRANSFORMERS_CACHE=/app/data/hf_cache/ \
      --name autocheck-${domain} \
      autocheck_ext \
      python ./src/app.py --url ${domain} \
                        --log_file_address /app/data/${volume}/log.txt \
                        --p_log_file_address /app/data/${volume}/log.jsonl \
                        --screen_file_address /app/data/${volume}/screenshots/ \
                        --html_file_address /app/data/${volume}/source_checkout/
  
  for id in "${container_ids[@]}"; do
    docker wait "$id"
  done

  for id in "${container_ids[@]}"; do
    docker container rm "$id"
  done
}



while [[ "$#" -gt 0 ]]; do
    case $1 in
        --domain) domain="$2"; shift ;;
        --volume) volume="$2"; shift ;;
        --core) core="$2"; shift ;;
        --build) build="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

timestamp=$(date +%s%3N)

mkdir "$SCAMAGNIFIER_EXT_V_DATA/${domain}_${timestamp}"
mkdir "$SCAMAGNIFIER_EXT_V_DATA/${domain}_${timestamp}/source_home"
mkdir "$SCAMAGNIFIER_EXT_V_DATA/${domain}_${timestamp}/screenshots"
mkdir "$SCAMAGNIFIER_EXT_V_DATA/${domain}_${timestamp}/source_checkout"

build_autocheckout

start_auto_checkout "${domain}" "${domain}_${timestamp}" "${core}"