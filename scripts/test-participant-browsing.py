"""Local regression checks with disposable data. Never contacts Supabase or email.

Build with VITE_ACCESS_MODE=local, serve dist, then run:
  python scripts/test-participant-browsing.py --url http://127.0.0.1:5175
"""
import argparse
import time
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

OWN = "object-detector-occlusion"
OTHER = "llm-personality-emotion"
ROOT = "#/projectboard"


def run(url):
    assert urlparse(url).hostname in ("localhost", "127.0.0.1"), "Local preview only"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.route("**/*", lambda r: r.continue_() if r.request.url.startswith(url + "/") else r.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        page.wait_for_load_state("networkidle")
        page.evaluate("""({own, other, expiry}) => {
          localStorage.setItem('myssp-committee-roster-v1', JSON.stringify([
            {id:'fixture-person',name:'Test Participant',email:'test@example.test',projectId:own,revision:1,revoked:false},
            {id:'fixture-other',name:'Other Participant',email:'other@example.test',projectId:other,revision:1,revoked:false}
          ]));
          sessionStorage.setItem('myssp-preview-session-v1',JSON.stringify({participantId:'fixture-person',projectId:own,revision:1,expiresAt:expiry}));
          localStorage.setItem('myssp-library-visibility-v1', JSON.stringify({version:1,visibleIds:[own,other]}));
          localStorage.setItem('myssp-project-editing-v1', JSON.stringify({version:1,visibleIds:[own,other]}));
        }""", {"own": OWN, "other": OTHER, "expiry": int(time.time()*1000)+3600000})
        page.reload()

        def visit(path):
            page.evaluate("path => location.hash = path", path)
            page.wait_for_timeout(180)

        def header_signout():
            return page.get_by_role("button", name="Sign out", exact=True).first

        visit(ROOT + "/project/" + OWN)
        expect(page.get_by_role("button", name="Edit project", exact=True)).to_be_visible()
        # Repeated saves do not log the participant out, lose changes, or leak
        # edit controls onto another team's public project.
        for i in range(8):
            page.get_by_role("button", name="Edit project", exact=True).click()
            page.get_by_role("textbox", name="Project title", exact=True).fill(f"Saved research {i}")
            page.get_by_role("button", name="Save changes", exact=True).click()
            expect(page.get_by_role("heading", name=f"Saved research {i}", exact=True)).to_be_visible()
            expect(header_signout()).to_be_visible()
            page.get_by_role("link", name="Browse projects", exact=True).click()
            expect(page.get_by_role("link", name="My project", exact=True)).to_be_visible()
            visit(ROOT + "/project/" + OTHER)
            expect(page.get_by_role("button", name="Edit project", exact=True)).to_have_count(0)
            expect(header_signout()).to_be_visible()
            visit(ROOT)
            page.get_by_role("link", name="My project", exact=True).click()

        page.reload()
        expect(page.get_by_role("heading", name="Saved research 7", exact=True)).to_be_visible()
        expect(header_signout()).to_be_visible()
        page.get_by_role("button", name="Edit project", exact=True).click()
        page.get_by_role("textbox", name="Project title", exact=True).fill("Unsaved title")
        # Cancelling navigation preserves the editor and signing out also warns.
        page.once("dialog", lambda d: d.dismiss())
        page.get_by_role("link", name="Project Archive", exact=True).last.click()
        expect(page.get_by_role("textbox", name="Project title", exact=True)).to_have_value("Unsaved title")
        header_signout().click()
        dialog = page.get_by_role("alertdialog")
        expect(dialog).to_contain_text("unsaved changes")
        dialog.get_by_role("button", name="Stay signed in").click()
        expect(page.get_by_role("textbox", name="Project title", exact=True)).to_have_value("Unsaved title")
        # Empty titles fail validation without losing the session.
        page.get_by_role("textbox", name="Project title", exact=True).fill("")
        page.get_by_role("button", name="Save changes", exact=True).click()
        expect(page.locator(".pb-inline-toolbar [role=status]")).to_contain_text("Add a project title")
        page.get_by_role("textbox", name="Project title", exact=True).fill("Saved research 7")
        page.once("dialog", lambda d: d.accept())
        page.get_by_role("button", name="Cancel", exact=True).click()

        # A browser-storage write failure retains unsaved work.
        page.get_by_role("button", name="Edit project", exact=True).click()
        page.get_by_role("textbox", name="Project title", exact=True).fill("Keep this on failed save")
        page.evaluate("""() => {
          window.originalSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key,value) {
            if(key.startsWith('myssp-projectboard-preview:draft')) throw new DOMException('Quota','QuotaExceededError');
            return window.originalSetItem.call(this,key,value);
          };
        }""")
        page.get_by_role("button", name="Save changes", exact=True).click()
        expect(page.locator(".pb-inline-toolbar [role=status]")).to_contain_text("Could not save")
        expect(page.get_by_role("textbox", name="Project title", exact=True)).to_have_value("Keep this on failed save")
        page.evaluate("() => { Storage.prototype.setItem = window.originalSetItem; }")
        page.get_by_role("button", name="Save changes", exact=True).click()
        expect(page.get_by_role("heading", name="Keep this on failed save", exact=True)).to_be_visible()

        # Rapid navigation between all public sections must preserve sign-in.
        for _ in range(3):
            for route in ["#/resources", "#/projects/2026", "#/judges/2026", "#/awards/2026", "#/", ROOT]:
                visit(route)
                expect(header_signout()).to_be_visible()
        page.get_by_role("link", name="My project", exact=True).click()
        # Publication and editing are independent. Hidden own work remains
        # accessible; a hidden project assigned to somebody else does not.
        page.evaluate("""() => {
          localStorage.setItem('myssp-library-visibility-v1',JSON.stringify({version:1,visibleIds:[]}));
          dispatchEvent(new StorageEvent('storage',{key:'myssp-library-visibility-v1'}));
        }""")
        visit(ROOT + "/project/" + OTHER)
        expect(page.get_by_role("heading", name="Project not available.")).to_be_visible()
        visit(ROOT + "/project/" + OWN)
        expect(page.get_by_role("button", name="Edit project", exact=True)).to_be_enabled()
        page.evaluate("""() => {
          localStorage.setItem('myssp-project-editing-v1',JSON.stringify({version:1,visibleIds:[]}));
          dispatchEvent(new StorageEvent('storage',{key:'myssp-project-editing-v1'}));
        }""")
        expect(page.get_by_role("button", name="Edit project", exact=True)).to_be_disabled()

        # Responsive sign-out confirmation: cancel and Escape keep the session;
        # confirmed sign-out clears it, including after a reload.
        page.set_viewport_size({"width":390,"height":844})
        header_signout().click()
        expect(page.get_by_role("alertdialog")).to_be_visible()
        page.keyboard.press("Escape")
        expect(page.get_by_role("alertdialog")).to_have_count(0)
        header_signout().click()
        page.get_by_role("alertdialog").get_by_role("button", name="Sign out", exact=True).click()
        expect(page.get_by_role("button", name="Sign in", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Project not available.")).to_be_visible()
        page.reload()
        expect(page.get_by_role("button", name="Sign in", exact=True)).to_be_visible()
        assert not page.evaluate("sessionStorage.getItem('myssp-preview-session-v1')")
        assert not errors, errors
        browser.close()
        print("PASS: 8 save/browse cycles, reload persistence, 18 route changes, cross-team access, hidden projects, editing locks, invalid title, failed-save recovery, unsaved navigation, sign-out confirmation and mobile flow")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5175")
    run(parser.parse_args().url.rstrip("/"))
