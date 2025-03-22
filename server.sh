#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

handle_error() {
    echo "Error: $1"
    exit 1
}

check_env_vars() {
    local missing_vars=0

    # List of required environment variables
    local required_vars=(
        "SCAMAGNIFIER_EXT_V_MONGO"
        "SCAMAGNIFIER_EXT_V_DATA"
        "SCAMAGNIFIER_EXT_P_DATA"
        "SCAMAGNIFIER_EXT_G_DATA"
        "SCAMAGNIFIER_EXT_SCAMMAGNIFIER_IP"
        "SCAMAGNIFIER_EXT_SELENIUM_ADDRESS"
        "SCAMAGNIFIER_EXT_MONGO_ROOT_USERNAME"
        "SCAMAGNIFIER_EXT_MONGO_USER_PASSWORD"
        "SCAMAGNIFIER_EXT_MONGO_NORMAL_USERNAME"
        "SCAMAGNIFIER_EXT_MONGO_NORMAL_PASSWORD"
        "SCAMAGNIFIER_EXT_MONGO_HOST"
        "SCAMAGNIFIER_EXT_MONGO_PORT"
        "SCAMAGNIFIER_EXT_MONGO_DB"
        "SCAMAGNIFIER_EXT_SELENIUM_USERNAME"
    )

    for var_name in "${required_vars[@]}"; do
        if [ -z "${!var_name}" ]; then
            handle_error "Environment variable $var_name is not set or empty."
            missing_vars=1
        fi
    done

    return $missing_vars
}

show_help() {
  echo "Usage: $0 command [options]"
  echo "Options:"
  echo "  --remote=value"
  echo "  --service=value"
  echo "  --debug=value"
}
main(){
    source ./env.sh
    check_env_vars


    VALID_COMMANDS=("install" "run" "build" "log" "stop")
    REMOTE=""
    SERVICE=""
    DEBUG=""
    COMMAND=""

    while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --remote=*)
            REMOTE="${key#*=}"
            shift
            ;;
        --service=*)
            SERVICE="${key#*=}"
            shift
            ;;
        --debug=*)
            DEBUG="${key#*=}"
            shift
            ;;
        *)
            # Assume it's the command
            COMMAND="$key"
            shift
            ;;
    esac
    done


    # Validate command
    if ! [[ " ${VALID_COMMANDS[@]} " =~ " $COMMAND " ]]; then
        echo "Error: Invalid command '$COMMAND'. Valid commands are: ${VALID_COMMANDS[@]}"
        exit 1
    fi

    case "$COMMAND" in
        install)
            echo -e "${BLUE}Starting installation...${NC}"
            if [ -n "$SERVICE" ] && [ "$SERVICE" = "yes" ]; then
                mkdir -p docker-entrypoint-initdb.d
                chmod +x create_mongo_user.sh
                sh create_mongo_user.sh
                mv mongo-init.js ./docker-entrypoint-initdb.d/
                if [ ! -f ./.htpasswd ]; then
                    htpasswd -c ./.htpasswd "${SCAMAGNIFIER_EXT_SELENIUM_USERNAME}"
                else
                    echo ".htpasswd already exists."
                fi
            fi

            if [ -n "${REMOTE}" ]; then
                DOCKER_HOST="$REMOTE" docker build --no-cache -t autocheck_ext ./autocheckout
                DOCKER_HOST="$REMOTE" docker build --no-cache -t domainfeaturext_ext ./domain_feature_extractor
                DOCKER_HOST="$REMOTE" docker build --no-cache -t domainclassifier_ext ./domain_classifier
                DOCKER_HOST="$REMOTE" docker build --no-cache -t shopclassifier_ext ./shop_classifier

            fi
            docker compose -f docker-compose-deploy.yml build
            echo -e "${GREEN}Installation complete.${NC}"
            ;;
        run)
            echo -e "${BLUE}Running the application...${NC}"
            if [[ $DEBUG == "yes" ]]; then
                docker compose -f docker-compose-deploy.yml up
                echo -e "${RED}Application is now stop.${NC}"
            else
                docker compose -f docker-compose-deploy.yml up -d
                echo -e "${GREEN}Application is now running.${NC}"
            fi
            
            ;;
        stop)
            docker compose -f docker-compose-deploy.yml down
            echo -e "${RED}Application is now stop.${NC}"
            ;;
        build)
            docker compose -f docker-compose-deploy.yml build
            ;;
        pass)
            htpasswd -c ./.htpasswd "${SCAMAGNIFIER_EXT_SELENIUM_USERNAME}"
            ;;
	    rest)
		    docker compose -f docker-compose-deploy.yml restart
		    ;;
        log)
		    docker compose -f docker-compose-deploy.yml logs -f
		    ;;
        remove)
            docker compose -f docker-compose-deploy.yml down  # Corrected command name
            docker image prune -f
            docker container prune -f
            docker volume prune -f
            docker network prune -f
            sudo rm -r "${SCAMAGNIFIER_EXT_V_MONGO}"/*
            sudo rm -r "${SCAMAGNIFIER_EXT_V_DATA}"/*
            sudo rm -r "${SCAMAGNIFIER_EXT_P_DATA}"/*
            sudo rm -r "${SCAMAGNIFIER_EXT_G_DATA}"/*
            sudo rm ./.htpasswd
            ;;
        *)
            # Handle invalid arguments
            echo "Invalid argument: $1"
            echo "Usage: $0 <install|run|stop|pass|remove>"
            exit 2
            ;;
    esac
}

main "$@"
