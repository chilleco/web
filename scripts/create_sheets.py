"""
Create a spreadsheet in Google Sheets

python -m scripts.create_sheets --title="" --page="" --mail=""
"""

import argparse

from lib.docs import Sheets


def _args():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--title",
        type=str,
        required=False,
        default="Title",
        help="Spreadsheet title",
    )

    parser.add_argument(
        "--page",
        type=str,
        required=False,
        default="Main",
        help="Worksheet title",
    )

    parser.add_argument(
        "--mail",
        type=str,
        required=True,
        help="Admin e-mail",
    )

    return parser.parse_args()


def main(args: argparse.Namespace):
    """Create a spreadsheet by title and email"""

    sheets = Sheets.create(args.title, args.page, args.mail)
    print(sheets.sheets.url)

    while True:
        title = input("To add extra page, enter the name (or press Enter): ")
        if not title:
            break
        print(sheets.add_sheet(title.strip()))


if __name__ == "__main__":
    main(_args())
