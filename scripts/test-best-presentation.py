"""Rehearse judging, results, and export in a disposable local preview."""
import argparse
import csv
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


def run(url):
    if urlparse(url).hostname not in ("localhost", "127.0.0.1"):
        raise ValueError("Use a localhost preview in local access mode.")
    projects = ["object-detector-occlusion", "llm-personality-emotion"]
    judges, reviews = [], {}
    for name, kind, attends, values in [
        ("Main", "main", True, [1, 5]),
        ("Special", "special", True, [5, 1]),
        ("Remote", "main", False, [5, 5]),
    ]:
        judges.append(dict(id=name, name=name, email=f"{name.lower()}@example.test",
                           code="DEMO01", kind=kind, attendsDemoDay=attends,
                           cohortYear=2026, revoked=False, invitedAt=1, deletedAt=None,
                           specialAward="utar" if kind == "special" else None))
        reviews[name] = {}
        for project, value in zip(projects, values):
            presentation = dict.fromkeys(("structure", "clarity", "qa_depth", "visual_aids",
                                          "time_management"), value if attends else None)
            reviews[name][project] = dict(**presentation, projectId=project, data_collection=5,
                analysis=5, findings_validity=5, researchOnly=not attends, researchRemarks="Research notes",
                presentationRemarks="Presentation notes" if attends else "",
                updatedAt="2026-11-27T08:00:00Z", submittedAt=None if name == "Special" else "2026-11-27T08:00:00Z")
    reviews["Special"][projects[1]]["clarity"] = None
    seed = dict(judges=judges, reviews=reviews, lineups={"2026": projects},
                switches={"2026": dict(judgingOpen=True, feedbackReleased=False)})
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 950}, reduced_motion="reduce")
        context.route("**/*", lambda route: route.continue_()
                      if route.request.url.startswith(url + "/") else route.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        page.evaluate("s => localStorage.setItem('myssp-judging-preview-v2',JSON.stringify(s))", seed)
        page.reload()

        def results():
            page.get_by_role("button", name="Judging", exact=True).click()
            page.get_by_role("tab", name="Progress & results").click()

        def choose(award):
            page.get_by_role("combobox", name="Award results").click()
            page.get_by_role("option", name=award, exact=True).click()

        def open_committee():
            page.goto(url + "/#/admin")
            page.reload()
            page.get_by_role("button", name="Open workspace on this device").click()
            results()
            choose("Best Presentation")

        open_committee()
        rows = page.locator(".jd-result-row")
        expect(rows).to_have_count(2)
        expect(rows.first.locator(".jd-average")).to_contain_text("5.0")
        expect(rows.first.locator("td").last).to_have_text("2")
        expect(page.get_by_role("columnheader", name="Remote")).to_have_count(0)
        expect(page.locator(".jd-results-stats")).to_contain_text("2 of 4 reviews submitted")

        # Use a second tab for the judge session. The committee should see new scores
        # via the normal storage update without reloading or signing in again.
        judge = context.new_page()
        judge.on("pageerror", lambda error: errors.append(str(error)))
        judge.goto(url)
        judge.get_by_role("button", name="Sign in", exact=True).click()
        login = judge.get_by_role("dialog")
        login.get_by_role("button", name="Judge", exact=True).click()
        login.get_by_label("Email address").fill("special@example.test")
        login.get_by_label("Access code").fill("DEMO01")
        login.get_by_role("button", name="Sign in", exact=True).click()
        judge.get_by_role("button", name="Finish unanswered questions").click()
        clarity = judge.get_by_role("radiogroup", name="Clarity of Explanation").get_by_role("radio").first
        clarity.press("Space")
        expect(clarity).to_be_checked()
        judge.wait_for_function(
            "id => JSON.parse(localStorage.getItem('myssp-judging-preview-v2')).reviews.Special[id].clarity === 1",
            arg=projects[1],
        )
        judge.reload()
        expect(clarity).to_be_checked()
        judge.get_by_role("button", name="Back to lineup", exact=True).last.click()
        judge.get_by_role("button", name="Submit all reviews", exact=True).click()
        confirm = judge.get_by_role("dialog")
        submit = confirm.get_by_role("button", name="Submit final reviews")
        expect(submit).to_be_disabled()
        confirm.get_by_role("checkbox").check()
        submit.click()
        expect(judge.get_by_text("All reviews submitted and locked.")).to_be_visible()
        expect(page.locator(".jd-results-stats")).to_contain_text("4 of 4 reviews submitted")
        for row in rows.all():
            expect(row.locator(".jd-average")).to_contain_text("15.0")
            expect(row.locator(".jd-score-count")).to_have_text("2 scores")
            expect(row.locator("td").last).to_have_text("1")
        page.get_by_role("button", name="Show reviews for A-1", exact=True).click()
        expect(page.locator(".jd-review-card")).to_have_count(2)
        expect(page.locator(".jd-detail")).to_contain_text("Presentation notes")
        expect(page.locator(".jd-detail")).not_to_contain_text("Research notes")
        with page.expect_download() as exported:
            page.get_by_role("button", name="Export CSV").click()
        download = exported.value
        assert download.suggested_filename == "myssp-2026-best-presentation.csv"
        with Path(download.path()).open(encoding="utf-8-sig", newline="") as file:
            data = list(csv.DictReader(file))
        assert [(r["Project code"], r["Submitted presentation scores"], r["Presentation average"], r["Rank"])
                for r in data] == [("A-1", "2", "15", "1"), ("A-2", "2", "15", "1")]
        choose("All judges (overview)")
        expect(page.get_by_role("columnheader", name="Best Presentation", exact=True)).to_be_visible()
        for row in rows.all():
            expect(row.locator("td").nth(-2)).to_have_text("1")
        page.set_viewport_size({"width": 390, "height": 844})
        choose("Best Presentation")
        expect(page.get_by_role("button", name="Export CSV")).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Mobile page overflow"
        assert not errors, errors
        browser.close()
        print("PASS: judge final submission and locking, committee updates, both judge types, ties, drill-down, CSV and mobile results")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5219")
    run(parser.parse_args().url.rstrip("/"))
