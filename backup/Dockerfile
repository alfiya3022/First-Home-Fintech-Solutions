
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 python3-venv gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/backup-venv

ENV PATH="/opt/backup-venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backup.py .
COPY restore.py .

CMD ["python", "-u", "backup.py"]
