#!/usr/bin/env python
"""Django 명령어 실행 파일 (예: python manage.py runserver)"""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django를 찾을 수 없습니다. 가상환경을 켰는지(activate), "
            "pip install -r requirements.txt 를 실행했는지 확인하세요."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
