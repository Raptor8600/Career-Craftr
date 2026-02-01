/**
 * CareerCraftr - Combined Script for file:// compatibility
 * Version: 2.5.0 (Bundled)
 */

window.CareerCraftr = window.CareerCraftr || {};
const CC = window.CareerCraftr;

// --- CONFIG ---
CC.config = {
    supabase: {
        url: 'https://wyvfbdsxudiecwkwywcb.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dmZiZHN4dWRpZWN3a3d5d2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MDU4OTcsImV4cCI6MjA4NTQ4MTg5N30.m5HUIxs6hYeszduKlEYoJ28tr2YpDTv2mYeemCXa8fg'
    }
};

// --- CLIENT INIT ---
// @ts-ignore
if (window.supabase) {
    CC.supabase = window.supabase.createClient(CC.config.supabase.url, CC.config.supabase.anonKey);
} else {
    console.error("Supabase CDN not loaded.");
}

// --- UTILS ---
CC.getSession = async function () {
    const { data } = await CC.supabase.auth.getSession();
    return data.session;
};
CC.signIn = async function (email, password) {
    return await CC.supabase.auth.signInWithPassword({ email, password });
};
CC.signUp = async function (email, password) {
    return await CC.supabase.auth.signUp({ email, password });
};
CC.signOut = async function () {
    return await CC.supabase.auth.signOut();
};
CC.ensureProfile = async function (user) {
    if (!user) return null;
    const { data } = await CC.supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) return data;
    // Create if missing
    const { data: newData, error } = await CC.supabase.from('profiles').insert([{ id: user.id }]).select().single();
    if (error) console.error("Profile creation failed", error);
    return newData;
};

// --- AUTH LOGIC ---
CC.initAuth = async function () {
    const loginBtn = document.getElementById('login-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.getElementById('auth-close');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const authToggle = document.getElementById('auth-toggle');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const adminTrigger = document.getElementById('admin-trigger');

    // --- UI ELEMENTS ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');

    // Delete Elements
    const deleteTrigger = document.getElementById('delete-account-trigger');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-final');
    const cancelDeleteBtn = document.getElementById('cancel-delete');

    let isLoginMode = true;

    function updateAuthUI(session) {
        if (session) {
            console.log("Logged In:", session.user.email);
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userDisplay) {
                userDisplay.classList.remove('hidden');
                document.querySelectorAll('.user-email, .user-email-display').forEach(el => el.textContent = session.user.email);
            }
            if (adminTrigger) adminTrigger.classList.remove('hidden');

            CC.ensureProfile(session.user).then(p => {
                window.currentUserProfile = p;
            });
        } else {
            console.log("Logged Out");
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userDisplay) userDisplay.classList.add('hidden');
            if (adminTrigger) adminTrigger.classList.add('hidden');
            if (settingsModal) settingsModal.classList.add('hidden');
            window.currentUserProfile = null;
        }
    }

    // BINDINGS
    if (loginBtn) loginBtn.onclick = (e) => {
        e.preventDefault();
        if (authModal) {
            authModal.classList.remove('hidden');
            authModal.style.display = 'flex';
        }
    };
    if (closeModal) closeModal.onclick = () => authModal.classList.add('hidden');

    if (authToggle) authToggle.onclick = () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = "Log In";
            authSubmit.textContent = "Log In";
            authToggle.textContent = "Don't have an account? Sign Up";
            if (authDisclaimer) authDisclaimer.classList.add('hidden');
        } else {
            authTitle.textContent = "Sign Up";
            authSubmit.textContent = "Sign Up";
            authToggle.textContent = "Already have an account? Log In";
            if (authDisclaimer) authDisclaimer.classList.remove('hidden');
        }
    };

    if (authForm) authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        authSubmit.disabled = true;
        authSubmit.textContent = "Processing...";

        try {
            const { data, error } = isLoginMode ? await CC.signIn(email, pass) : await CC.signUp(email, pass);
            if (error) alert(error.message);
            else {
                if (!isLoginMode && !data.session) alert("Confirmation link sent to your email. Please check your Inbox and Spam folder.");
                authModal.classList.add('hidden');
                authForm.reset();
            }
        } catch (err) { alert("Error: " + err.message); }
        finally {
            authSubmit.disabled = false;
            authSubmit.textContent = isLoginMode ? "Log In" : "Sign Up";
        }
    };

    if (logoutBtn) logoutBtn.onclick = async () => { await CC.signOut(); };

    // --- SETTINGS LOGIC ---
    if (settingsBtn) {
        settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
    }
    if (settingsClose) {
        settingsClose.onclick = () => settingsModal.classList.add('hidden');
    }

    const changePassBtn = document.getElementById('change-password-btn');
    if (changePassBtn) {
        changePassBtn.onclick = async () => {
            const newPass = document.getElementById('new-password').value;
            if (!newPass || newPass.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }
            changePassBtn.disabled = true;
            changePassBtn.textContent = "Updating...";

            const { error } = await CC.supabase.auth.updateUser({ password: newPass });

            if (error) alert("Error: " + error.message);
            else {
                alert("Password updated successfully!");
                document.getElementById('new-password').value = "";
            }
            changePassBtn.disabled = false;
            changePassBtn.textContent = "Update Password";
        };
    }

    // --- DELETE FLOW ---
    if (deleteTrigger) {
        deleteTrigger.onclick = () => {
            // Close settings, open confirm
            settingsModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('hidden');
            deleteConfirmModal.style.display = 'flex';
        };
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = () => deleteConfirmModal.classList.add('hidden');
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = "Deleting...";
            try {
                const session = await CC.getSession();
                if (!session) return;

                // 1. Delete Profile Data
                const { error: profileError } = await CC.supabase
                    .from('profiles')
                    .delete()
                    .eq('id', session.user.id);

                // 2. Try RPC (optimistic)
                await CC.supabase.rpc('delete_user');

                alert("Your account has been deleted.");
                await CC.signOut();
                location.reload();
            } catch (e) {
                console.error(e);
                alert("Account data cleared.");
                await CC.signOut();
                location.reload();
            }
        };
    }

    // --- DATA PERSISTENCE ---
    CC.loadProfileData = function (profile) {
        if (!profile || !profile.resume_data) return;

        console.log("Loading Profile Data...", profile.resume_data);
        const data = profile.resume_data;
        let loadedCount = 0;

        // Apply text content
        Object.keys(data).forEach(key => {
            // Try ID first
            let el = document.getElementById(key);
            // Try data-key second (for dynamic blocks)
            if (!el) el = document.querySelector(`[data-key="${key}"]`);

            if (el) {
                // Skip link elements - they're handled separately
                if (el.tagName === 'A') {
                    return; // Don't overwrite link text with innerHTML
                }
                el.innerHTML = data[key];
                loadedCount++;
            } else {
                // If element doesn't exist (e.g., custom added block), recreate it?
                // For now, simpler: we only support fixed fields or we need a way to verify block types.
                // Advanced: Re-creating dynamic blocks would go here.
                // Checking if it looks like a block
                if (key.startsWith('custom-block-')) {
                    const newBlock = document.createElement('div');
                    newBlock.className = 'editable-block';
                    newBlock.setAttribute('data-editable', 'true');
                    newBlock.dataset.key = key;
                    newBlock.innerHTML = data[key];
                    newBlock.style.padding = "1rem";
                    newBlock.style.margin = "1rem 0";
                    newBlock.style.border = "1px dashed #ccc"; // Style might need re-applying if CSS class handles most

                    // Allow edit if we are owner (managed by edit mode toggle separately)

                    const target = document.querySelector('section .container') || document.body;
                    target.appendChild(newBlock);
                }
            }
        });

        console.log(`✅ Loaded ${loadedCount} elements from database`);
    };

    // Init Session
    try {
        const { data } = await CC.supabase.auth.getSession();

        // CHECK FOR PUBLIC VIEW URL
        const urlParams = new URLSearchParams(window.location.search);
        const publicUid = urlParams.get('uid');

        if (publicUid) {
            console.log("Viewing Public Profile:", publicUid);
            // Fetch public profile
            const { data: publicProfile, error } = await CC.supabase
                .from('profiles')
                .select('*')
                .eq('id', publicUid)
                .single();

            if (publicProfile) {
                CC.loadProfileData(publicProfile);
                document.body.classList.add('read-only-view');
                // Hide auth controls
                if (document.getElementById('auth-controls')) document.getElementById('auth-controls').style.display = 'none';
                if (adminTrigger) adminTrigger.style.display = 'none';
            }
        } else {
            // Normal Owner Flow
            updateAuthUI(data.session);
            CC.supabase.auth.onAuthStateChange((e, s) => updateAuthUI(s));

            // Load own data if logged in
            if (data.session) {
                const profile = await CC.ensureProfile(data.session.user);
                if (profile) CC.loadProfileData(profile);
            }
        }

    } catch (e) { console.warn("Supabase not reachable?", e); }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Booting CareerCraftr (Flat)...");

    // 1. Init Auth
    CC.initAuth();

    // 2. Init Router (Simplified)
    // Checks hash/params to decide view mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) {
        console.log("Public View Mode: " + params.get('id'));
        document.body.classList.add('read-only');
        if (document.getElementById('admin-trigger')) document.getElementById('admin-trigger').remove();
        if (document.getElementById('auth-controls')) document.getElementById('auth-controls').remove();
    }

    // 3. Init Legacy Interactions (Scroll, Mobile Menu)
    const mobileBtn = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn) mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active'); // Basic toggle for now
        // Force flex display on toggle for mobile
        if (navLinks.classList.contains('active')) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = 0;
            navLinks.style.width = '100%';
            navLinks.style.backgroundColor = 'white';
        } else {
            navLinks.style.display = '';
        }
    });

    // --- EDITOR LOGIC ---
    const adminTrigger = document.getElementById('admin-trigger');
    const adminBar = document.getElementById('admin-bar');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const shareBtn = document.getElementById('share-btn');
    const editorSidebar = document.getElementById('editor-sidebar');

    console.log("Editor Elements Found:", {
        adminTrigger: !!adminTrigger,
        editorSidebar: !!editorSidebar,
        adminBar: !!adminBar
    });

    // Share Logic
    if (shareBtn) shareBtn.onclick = async () => {
        const session = await CC.getSession();
        if (session) {
            const url = `${window.location.origin}${window.location.pathname}?uid=${session.user.id}`;
            navigator.clipboard.writeText(url).then(() => {
                alert("Public Share Link copied to clipboard!\n\n" + url);
            });
        }
    };

    // Enter Edit Mode
    if (adminTrigger) adminTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Entering Edit Mode...");
        document.body.classList.add('edit-mode');
        adminBar.classList.remove('hidden');

        if (editorSidebar) {
            console.log("Toggling Sidebar Active Class");
            editorSidebar.classList.add('active');
            // Force verify style
            editorSidebar.style.left = "0";
        } else {
            console.error("Editor Sidebar NOT FOUND in DOM");
        }

        alert("Edit Mode Active. You can now click text to edit.");

        // Enable ContentEditable
        document.querySelectorAll('[data-editable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            if (!el.dataset.original) el.dataset.original = el.innerHTML;
        });
    });

    // Save Changes
    if (saveBtn) saveBtn.onclick = async () => {
        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        try {
            const session = await CC.getSession();
            if (!session) throw new Error("Not logged in");

            // Gather Data
            const updates = {};
            // Text
            document.querySelectorAll('[data-editable="true"]').forEach(el => {
                const key = el.id || el.dataset.key;
                if (key) updates[key] = el.innerHTML;
            });
            // Resume Link (special case - href only)
            const resumeLink = document.getElementById('resume-link');
            if (resumeLink) {
                updates['resume-link-href'] = resumeLink.getAttribute('href');
            }
            // Images
            document.querySelectorAll('[data-editable-image="true"]').forEach(el => {
                const key = el.id || 'profile-img';
                updates[key] = el.src;
            });

            console.log("Saving Updates:", updates);

            // Update Profile
            const { error } = await CC.supabase
                .from('profiles')
                .update({ resume_data: updates, updated_at: new Date() })
                .eq('id', session.user.id);

            if (error) throw error;

            alert("Changes saved to Database!");
        } catch (e) {
            console.error(e);
            alert("Save failed: " + e.message);
        } finally {
            saveBtn.textContent = "Save Changes";
            saveBtn.disabled = false;
        }
    };

    // Discard Changes
    if (cancelBtn) cancelBtn.onclick = () => {
        if (!confirm("Discard unsaved changes?")) return;

        document.querySelectorAll('[data-editable="true"]').forEach(el => {
            if (el.dataset.original) el.innerHTML = el.dataset.original;
        });

        // Exit Edit Mode
        document.body.classList.remove('edit-mode');
        adminBar.classList.add('hidden');
        if (editorSidebar) editorSidebar.classList.remove('active');


        document.querySelectorAll('[data-editable="true"]').forEach(el => {
            el.removeAttribute('contenteditable');
        });
    };

    // --- PROFILE PICTURE EDIT ---
    const profileImg = document.getElementById('profile-img');
    if (profileImg) {
        profileImg.addEventListener('click', () => {
            if (document.body.classList.contains('edit-mode')) {
                const newUrl = prompt("Enter Image URL for your profile picture:", profileImg.src);
                if (newUrl) {
                    profileImg.src = newUrl;
                }
            }
        });
        profileImg.style.cursor = 'pointer';
    }

    // --- TEMPLATE SYSTEM (Canva-style) ---
    const templateButtons = document.querySelectorAll('.template-btn');

    const templates = {
        'heading': {
            html: '<h2 style="font-family: var(--font-heading); font-size: 2.5rem; color: var(--color-primary); margin-bottom: 1rem;">Your Heading Here</h2>',
            editable: true
        },
        'subheading': {
            html: '<h3 style="font-family: var(--font-heading); font-size: 1.8rem; color: var(--color-text-main); margin-bottom: 0.75rem;">Your Subheading</h3>',
            editable: true
        },
        'body': {
            html: '<p style="font-size: 1rem; line-height: 1.6; color: var(--color-text-light);">Add your body text here. Click to edit and customize this paragraph.</p>',
            editable: true
        },
        'skills-grid': {
            html: `
                <div style="padding: 2rem; background: #f9f9f9; border-radius: 8px; margin: 2rem 0;">
                    <h3 style="margin-bottom: 1.5rem; color: var(--color-primary);">Skills & Technologies</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div style="background: white; padding: 1rem; border-radius: 6px; text-align: center; border: 1px solid #ddd;">
                            <strong>Skill 1</strong>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 6px; text-align: center; border: 1px solid #ddd;">
                            <strong>Skill 2</strong>
                        </div>
                        <div style="background: white; padding: 1rem; border-radius: 6px; text-align: center; border: 1px solid #ddd;">
                            <strong>Skill 3</strong>
                        </div>
                    </div>
                </div>
            `,
            editable: true
        },
        'experience-card': {
            html: `
                <div style="padding: 2rem; background: white; border-left: 4px solid var(--color-secondary); margin: 2rem 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="color: var(--color-primary); margin-bottom: 0.5rem;">Job Title</h3>
                    <p style="color: var(--color-secondary); font-weight: 600; margin-bottom: 1rem;">Company Name | 2020 - Present</p>
                    <ul style="list-style: none; padding-left: 0;">
                        <li style="margin-bottom: 0.5rem;">✓ Achievement or responsibility</li>
                        <li style="margin-bottom: 0.5rem;">✓ Another key accomplishment</li>
                        <li style="margin-bottom: 0.5rem;">✓ Important project or result</li>
                    </ul>
                </div>
            `,
            editable: true
        },
        'project-showcase': {
            html: `
                <div style="padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin: 2rem 0;">
                    <h3 style="margin-bottom: 1rem;">Project Name</h3>
                    <p style="margin-bottom: 1rem; opacity: 0.9;">Brief description of your amazing project and what makes it special.</p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">Tech 1</span>
                        <span style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">Tech 2</span>
                    </div>
                </div>
            `,
            editable: true
        },
        'contact-info': {
            html: `
                <div style="padding: 2rem; background: var(--color-bg-dark); color: white; border-radius: 8px; margin: 2rem 0; text-align: center;">
                    <h3 style="margin-bottom: 1.5rem;">Get In Touch</h3>
                    <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;">
                        <div>
                            <p style="opacity: 0.8; margin-bottom: 0.25rem;">Email</p>
                            <p style="font-weight: 600;">your@email.com</p>
                        </div>
                        <div>
                            <p style="opacity: 0.8; margin-bottom: 0.25rem;">Phone</p>
                            <p style="font-weight: 600;">+1 (555) 123-4567</p>
                        </div>
                        <div>
                            <p style="opacity: 0.8; margin-bottom: 0.25rem;">Location</p>
                            <p style="font-weight: 600;">City, State</p>
                        </div>
                    </div>
                </div>
            `,
            editable: true
        }
    };

    templateButtons.forEach(btn => {
        btn.onclick = () => {
            const templateType = btn.getAttribute('data-template');
            const template = templates[templateType];

            if (template) {
                const newBlock = document.createElement('div');
                newBlock.className = 'editable-block';
                if (template.editable) {
                    newBlock.setAttribute('contenteditable', 'true');
                    newBlock.setAttribute('data-editable', 'true');
                }
                newBlock.dataset.key = `template-${templateType}-${Date.now()}`;
                newBlock.innerHTML = template.html;
                newBlock.style.maxWidth = "900px";
                newBlock.style.margin = "2rem auto";

                // Insert before footer
                const footer = document.querySelector('footer');
                if (footer) {
                    footer.parentNode.insertBefore(newBlock, footer);
                } else {
                    document.body.appendChild(newBlock);
                }
            }
        };
    });

    // --- RESUME FILE UPLOAD ---
    const uploadResumeBtn = document.getElementById('upload-resume-btn');
    const resumeFileInput = document.getElementById('resume-file-upload');
    const resumeStatus = document.getElementById('resume-status');
    const resumeLink = document.getElementById('resume-link');

    if (uploadResumeBtn && resumeFileInput) {
        uploadResumeBtn.onclick = () => {
            resumeFileInput.click();
        };

        resumeFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    if (resumeLink) {
                        resumeLink.href = base64;
                        resumeLink.download = file.name;
                        if (resumeStatus) {
                            resumeStatus.textContent = `✓ ${file.name} uploaded`;
                            resumeStatus.style.color = '#18BC9C';
                        }
                    }
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select a PDF file');
            }
        };
    }

    // --- FIX COLOR PICKER ---
    const colorPicker = document.getElementById('editor-color-picker');
    if (colorPicker) {
        colorPicker.onchange = (e) => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.color = e.target.value;
                try {
                    range.surroundContents(span);
                } catch (err) {
                    // If selection spans multiple elements, apply to parent
                    const parent = selection.anchorNode.parentElement;
                    if (parent && parent.hasAttribute('contenteditable')) {
                        parent.style.color = e.target.value;
                    }
                }
            }
        };
    }
});

