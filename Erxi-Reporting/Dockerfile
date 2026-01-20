FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install system build deps needed by some scientific packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential gcc g++ curl git \
       libpq-dev libssl-dev libffi-dev libxml2-dev libxmlsec1-dev \
       liblzma-dev libbz2-dev libreadline-dev libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt /app/requirements.txt

RUN python -m pip install --upgrade pip setuptools wheel build \
    && pip install --no-cache-dir -r requirements.txt

# Keep interactive shell by default for dev workflows
CMD ["/bin/bash"]
