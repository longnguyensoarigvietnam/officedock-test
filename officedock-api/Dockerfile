FROM python:3.10-slim

ENV PYTHONUNBUFFERED 1

RUN mkdir /code

WORKDIR /code

ADD requirements.txt /code/

# Install the required packages
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

ADD . /code/
