"""Test field creation and public filters in an isolated local-mode preview.

Run: python scripts/test-research-fields.py --url http://127.0.0.1:5175
All data belongs to a disposable browser context; external requests are blocked.
"""
import argparse
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright


def run(url, screenshot):
    parsed = urlparse(url)
    assert parsed.hostname in ("127.0.0.1", "localhost")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.route("**/*", lambda r: r.continue_() if r.request.url.startswith(origin + "/") else r.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(origin + "/#/admin")
        page.get_by_role("button", name="Open workspace on this device").click()
        page.get_by_role("navigation", name="Admin navigation").get_by_role("button", name="Projects", exact=True).click()
        page.get_by_role("button", name="Add project", exact=True).click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_role("button", name="Add research field", exact=True).click()
        dialog.get_by_label("Field name", exact=True).fill("Engineering")
        dialog.get_by_label("Code prefix", exact=True).fill("eng")
        if screenshot:
            Path(screenshot).parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=screenshot)
        dialog.get_by_role("button", name="Add field", exact=True).click()
        expect(dialog.get_by_role("combobox", name="Research field", exact=True)).to_contain_text("Engineering")
        expect(dialog.get_by_label("Project code", exact=False)).to_have_value("ENG-1")

        # Duplicate creation is rejected without losing the project being edited.
        dialog.get_by_role("button", name="Add research field", exact=True).click()
        dialog.get_by_label("Field name", exact=True).fill("engineering")
        dialog.get_by_label("Code prefix", exact=True).fill("ENG")
        dialog.get_by_role("button", name="Add field", exact=True).click()
        expect(dialog.get_by_role("alert")).to_contain_text("already exists")
        dialog.get_by_role("button", name="Cancel field", exact=True).click()
        dialog.get_by_label("Project title", exact=True).fill("Engineering field regression")
        dialog.get_by_role("button", name="Create project", exact=True).click()
        expect(dialog).not_to_be_visible()
        visibility = page.get_by_role("switch", name="Show ENG-1 in project archive", exact=True)
        expect(visibility).not_to_be_checked()
        expect(page.get_by_role("switch", name="Allow editing for ENG-1")).not_to_be_checked()

        # New projects stay out of the public Projects catalogue until published.
        page.goto(origin + "/#/projects/2026")
        expect(page.get_by_role("radio", name="Engineering", exact=True)).to_be_visible()
        expect(page.get_by_text("Engineering field regression", exact=True)).to_have_count(0)
        page.goto(origin + "/#/admin")
        page.get_by_role("navigation", name="Admin navigation").get_by_role("button", name="Projects", exact=True).click()
        page.get_by_role("switch", name="Show ENG-1 in project archive", exact=True).click()
        expect(page.get_by_role("switch", name="Show ENG-1 in project archive", exact=True)).to_be_checked()

        page.goto(origin + "/#/projects/2026")
        page.get_by_role("radio", name="Engineering", exact=True).check()
        expect(page.get_by_text("Engineering field regression", exact=True)).to_be_visible()
        page.get_by_text("Engineering field regression", exact=True).click()
        expect(page.get_by_role("dialog")).to_contain_text("Engineering field regression")
        page.keyboard.press("Escape")

        page.goto(origin + "/#/projectboard")
        page.get_by_role("button", name="Research field", exact=True).click()
        page.get_by_role("checkbox", name="Engineering", exact=True).check()
        expect(page.get_by_text("Engineering field regression", exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_text("Engineering field regression", exact=True)).to_be_visible()

        # The catalogue survives reloads, and the editor fits narrow screens.
        page.goto(origin + "/#/admin")
        page.get_by_role("navigation", name="Admin navigation").get_by_role("button", name="Projects", exact=True).click()
        page.get_by_role("button", name="Add project", exact=True).click()
        dialog.get_by_role("combobox", name="Research field", exact=True).click()
        page.get_by_role("option", name="Engineering", exact=True).click()
        expect(dialog.get_by_label("Project code", exact=False)).to_have_value("ENG-2")
        dialog.get_by_role("button", name="Add research field", exact=True).click()
        for width in (1440, 768, 390):
            page.set_viewport_size({"width": width, "height": 900})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"Overflow at {width}"
            assert dialog.evaluate("el => el.scrollWidth <= el.clientWidth + 1"), f"Dialog overflow at {width}"
            expect(dialog.get_by_role("button", name="Add field", exact=True)).to_be_visible()
        assert not errors, errors
        browser.close()
        print("PASS: creation, duplicate handling, persistence, code suggestions, visibility, Projects, Project Archive and responsive editor")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5175")
    parser.add_argument("--screenshot")
    args = parser.parse_args()
    run(args.url, args.screenshot)
