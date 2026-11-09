FROM python:3.13-alpine
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY simulator.py /app/simulator.py
USER 65532:65532
CMD ["python", "/app/simulator.py"]
