.PHONY: install build bundle phabricator deploy deploy-e2e test-unit test-watch test-e2e test-all selenium-chrome fmt fmt-check clean

default: bundle

install:
	npm install

build: install
	npm run tslint
	npm run build

bundle: build
	zip -r chrome-bundle.zip dist/*
	cd dist && zip -r ../firefox-bundle.xpi *

phabricator: clean build
	cp dist/js/phabricator.bundle.js ../../ui/assets/scripts/phabricator.bundle.js
	cp dist/js/phabricator.bundle.js.map ../../ui/assets/scripts/phabricator.bundle.js.map

test-unit:
	npm run test

test-watch:
	npm run test:auto


selenium-chrome: build
	docker build --no-cache -t us.gcr.io/sourcegraph-dev/selenium-standalone-chrome-with-extension:latest .
	gcloud docker -- push us.gcr.io/sourcegraph-dev/selenium-standalone-chrome-with-extension:latest

deploy-e2e:
	cd ../../test/e2e2 && make deploy

clean:
	rm -rf dist/ dev/ .checksum chrome-bundle.zip firefox-bundle.xpi

export CHROME_BUNDLE ?= $(shell pwd)/chrome-bundle.zip
deploy: clean bundle test-unit deploy-e2e
	./deploy.sh
