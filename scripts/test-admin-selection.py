"""Browser regression check for participant selection.

Install Python Playwright + Chromium, start a localhost preview built with
VITE_ACCESS_MODE=local, then run:
    python scripts/test-admin-selection.py --url http://127.0.0.1:5174

Uses a fresh browser context and synthetic participants. External requests are
blocked. Only the invitation confirmation is opened; no codes are sent.
"""
import argparse
import json
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


def roster(count=37):
    return [dict(
        id=f"test-{i}", name=f"Test Person {i:02}",
        email=f"person{i:02}@example.test",
        projectId="object-detector-occlusion" if i < 20 else "llm-personality-emotion",
        revoked=i == 5,
        displayProfile={"school": "North College" if i < 15 else "South College"},
    ) for i in range(count)]


def run(base_url, screenshot):
    parsed = urlparse(base_url)
    if parsed.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("Use an isolated localhost preview in local access mode.")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.route("**/*", lambda route: route.continue_()
                      if route.request.url.startswith(origin + "/") else route.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        # Seed only this disposable context; never use the user's browser storage.
        page.goto(origin)
        page.wait_for_load_state("networkidle")
        page.evaluate("rows => localStorage.setItem('myssp-committee-roster-v1', JSON.stringify(rows))", roster())
        page.goto(origin + "/#/admin")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Open workspace on this device").click()
        expect(page.locator("tbody tr")).to_have_count(12)

        select_all = page.get_by_role("checkbox", name="Select all matching participants")
        selection = page.locator(".ad-selection [role=status]")
        checked_rows = page.locator("tbody input[type=checkbox]:checked")

        def choose(label, value):
            page.get_by_role("combobox", name=label, exact=True).click()
            page.get_by_role("option", name=value, exact=True).click()

        # All pages, including the partially filled final page.
        select_all.check()
        expect(selection).to_have_text("37 of 37 selected across all pages")
        expect(checked_rows).to_have_count(12)
        for count in (12, 12, 1):
            page.get_by_role("button", name="Next page", exact=True).click()
            expect(checked_rows).to_have_count(count)
            expect(select_all).to_be_checked()

        # An off-page deselection must make the header mixed on every page.
        page.locator("tbody input[type=checkbox]").first.uncheck()
        expect(selection).to_have_text("36 of 37 selected across all pages")
        page.get_by_role("button", name="Previous page", exact=True).click()
        expect(checked_rows).to_have_count(12)
        expect(select_all).to_have_js_property("indeterminate", True)
        select_all.check()
        expect(selection).to_have_text("37 of 37 selected across all pages")
        select_all.uncheck()
        expect(selection).to_have_count(0)
        page.get_by_role("button", name="Previous page", exact=True).click()
        expect(checked_rows).to_have_count(0)

        # A full page selected manually is still only a partial cohort selection.
        for checkbox in page.locator("tbody input[type=checkbox]").all():
            checkbox.check()
        expect(selection).to_have_text("12 of 37 selected across all pages")
        expect(select_all).to_have_js_property("indeterminate", True)
        select_all.focus()
        page.keyboard.press("Space")
        expect(selection).to_have_text("37 of 37 selected across all pages")
        choose("Sort participants", "Name Z–A")
        expect(selection).to_have_text("37 of 37 selected across all pages")
        expect(checked_rows).to_have_count(12)

        # Filters reset selection. Bulk recipients use all matches, excluding revoked accounts.
        page.get_by_role("textbox", name="Search participants").fill("North")
        expect(selection).to_have_count(0)
        select_all.check()
        expect(selection).to_have_text("15 of 15 selected across all pages")
        page.get_by_role("button", name="Next page", exact=True).click()
        expect(checked_rows).to_have_count(3)
        page.get_by_role("button", name="Send access codes (14)", exact=True).click()
        expect(page.get_by_role("dialog")).to_contain_text("14 participants")
        expect(page.locator(".ad-invite-list > div")).to_have_count(14)
        expect(page.locator(".ad-invite-list")).not_to_contain_text("person05@example.test")
        page.get_by_role("button", name="Cancel", exact=True).click()
        page.get_by_role("button", name="Reset filters", exact=True).click()
        expect(selection).to_have_count(0)
        choose("Filter by project", "A-1")
        select_all.check()
        expect(selection).to_have_text("20 of 20 selected across all pages")
        choose("Filter by access status", "Revoked")
        expect(selection).to_have_count(0)
        select_all.check()
        expect(page.get_by_role("button", name="Send access codes (0)")).to_be_disabled()
        page.get_by_role("textbox", name="Search participants").fill("No such person")
        expect(select_all).to_be_disabled()
        expect(selection).to_have_count(0)
        page.get_by_role("button", name="Reset filters", exact=True).click()

        # Newly added people aren't silently included; removed people aren't sent codes.
        select_all.check()
        def update_roster(rows):
            page.evaluate("""rows => {
                localStorage.setItem('myssp-committee-roster-v1', JSON.stringify(rows));
                window.dispatchEvent(new StorageEvent('storage', {key:'myssp-committee-roster-v1'}));
            }""", rows)
        update_roster(roster(38))
        expect(selection).to_have_text("37 of 38 selected across all pages")
        expect(select_all).to_have_js_property("indeterminate", True)
        select_all.check()
        update_roster(roster(38)[1:])
        expect(selection).to_have_text("37 of 37 selected across all pages")

        # Large cohorts and the mobile selection summary.
        update_roster(roster(60))
        select_all.check()
        expect(selection).to_have_text("60 of 60 selected across all pages")
        page.get_by_role("button", name="Send access codes (59)", exact=True).click()
        expect(page.locator(".ad-invite-list > div")).to_have_count(59)
        page.get_by_role("button", name="Cancel", exact=True).click()
        page.set_viewport_size({"width": 390, "height": 844})
        expect(select_all).to_be_visible()
        select_all.uncheck()
        expect(selection).to_have_count(0)
        page.get_by_text("Select all 60 participants", exact=True).click()
        expect(selection).to_have_text("60 of 60 selected across all pages")
        selection.scroll_into_view_if_needed()
        expect(selection).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Mobile horizontal overflow"
        if screenshot:
            page.screenshot(path=screenshot)
        page.get_by_role("button", name="Clear selection", exact=True).click()
        expect(selection).to_have_count(0)
        assert not errors, errors
        browser.close()
        print("PASS: cross-page selection, mixed state, keyboard, sorting, filters, recipient counts, roster updates, 60-person cohort and mobile layout")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5174")
    parser.add_argument("--screenshot")
    args = parser.parse_args()
    run(args.url, args.screenshot)
