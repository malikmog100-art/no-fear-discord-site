const SERVER_NAME = '𝐍𝐨 𝐅𝐞𝐚𝐫';
const INVITE_LINK = 'https://discord.gg/0nf';
let ratings = [];

window.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

function initializePage() {
    setServerBranding();
    setupEventListeners();
    loadRatings();
    loadRules();
    updateAverageRating();
    startMemberCounter();
}

function setServerBranding() {
    const title = document.querySelector('.main-title');
    const subtitle = document.querySelector('.subtitle');
    const inviteLink = document.getElementById('inviteLink');
    const discordBtn = document.querySelector('.discord-btn');

    if (title) title.textContent = SERVER_NAME;
    if (subtitle) subtitle.textContent = 'سيرفر ديسكورد كومينتي للالعاب و الدردشة';
    if (inviteLink) inviteLink.textContent = INVITE_LINK;
    if (discordBtn) discordBtn.href = INVITE_LINK;
    document.title = `${SERVER_NAME} - سيرفر ديسكورد كومينتي`;
}

function setupEventListeners() {
    const ratingForm = document.getElementById('ratingForm');
    if (ratingForm) {
        ratingForm.addEventListener('submit', handleRatingSubmit);
    }

    const copyBtn = document.getElementById('copyInviteBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyInviteLink);
    }

    const exportBtn = document.getElementById('exportRatingsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportRatings);
    }

    const openImportBtn = document.getElementById('openImportBtn');
    const importInput = document.getElementById('importRatingsInput');
    if (openImportBtn && importInput) {
        openImportBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', importRatings);
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const ratingInputs = document.querySelectorAll('.star-rating input');
    const userNameInput = document.getElementById('userName');
    const commentInput = document.getElementById('comment');

    ratingInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateStarDisplay(this.value);
            updateRatingPreview();
        });
    });

    [userNameInput, commentInput].forEach(element => {
        if (element) {
            element.addEventListener('input', updateRatingPreview);
        }
    });

    updateRatingPreview();
}

function loadRatings() {
    const storedRatings = localStorage.getItem('nofearRatings');
    if (storedRatings) {
        try {
            ratings = JSON.parse(storedRatings);
        } catch (error) {
            ratings = [];
        }
        displayRatings();
        return;
    }

    fetch('ratings.json')
        .then(response => {
            if (!response.ok) throw new Error('No ratings file');
            return response.json();
        })
        .then(data => {
            ratings = data.ratings || [];
            displayRatings();
        })
        .catch(() => {
            ratings = [];
            displayRatings();
        });
}

function saveRatings() {
    localStorage.setItem('nofearRatings', JSON.stringify(ratings));

    const ratingsData = {
        serverName: SERVER_NAME,
        serverInvite: INVITE_LINK,
        ratings: ratings,
        statistics: {
            totalRatings: ratings.length,
            averageRating: ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : '0.0',
            lastUpdated: new Date().toISOString()
        }
    };

    const dataStr = JSON.stringify(ratingsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    window.updatedRatingsURL = URL.createObjectURL(dataBlob);
}

function handleRatingSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const userName = formData.get('userName').trim();
    const rating = parseInt(formData.get('rating'));
    const comment = formData.get('comment').trim();

    if (!userName || !rating) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    const newRating = {
        id: Date.now(),
        userName,
        rating,
        comment,
        date: new Date().toLocaleDateString('ar-SA')
    };

    ratings.unshift(newRating);
    saveRatings();
    displayRatings();
    updateAverageRating();

    event.target.reset();
    showNotification('تم إرسال تقييمك بنجاح!', 'success');
    showDownloadJSONButton();
}

function displayRatings() {
    const ratingsList = document.getElementById('ratingsList');
    if (!ratingsList) return;

    if (ratings.length === 0) {
        ratingsList.innerHTML = '<p style="text-align: center; color: #c0c0c0;">لا توجد تقييمات بعد. كن أول من يقيم!</p>';
        updateRatingSummary();
        return;
    }

    ratingsList.innerHTML = ratings.map(rating => `
        <div class="rating-item">
            <div class="rating-item-header">
                <span class="rating-user">${escapeHtml(rating.userName)}</span>
                <span class="rating-stars">${'★'.repeat(rating.rating)}${'☆'.repeat(5 - rating.rating)}</span>
            </div>
            ${rating.comment ? `<p class="rating-comment">"${escapeHtml(rating.comment)}"</p>` : ''}
            <small style="color: #9f9f9f; font-size: 0.95rem;">${rating.date}</small>
        </div>
    `).join('');

    updateRatingSummary();
}

function updateRatingSummary() {
    const totalRatingsElement = document.getElementById('totalRatings');
    const highestRatingElement = document.getElementById('highestRating');
    const lowestRatingElement = document.getElementById('lowestRating');
    const total = ratings.length;

    if (totalRatingsElement) {
        totalRatingsElement.textContent = total;
    }

    if (highestRatingElement) {
        highestRatingElement.textContent = total ? Math.max(...ratings.map(r => r.rating)) : '-';
    }

    if (lowestRatingElement) {
        lowestRatingElement.textContent = total ? Math.min(...ratings.map(r => r.rating)) : '-';
    }

    updateRatingDistribution();
}

function updateRatingDistribution() {
    const distributionContainer = document.getElementById('ratingDistribution');
    if (!distributionContainer) return;

    const counts = [0, 0, 0, 0, 0, 0];
    ratings.forEach(item => {
        if (item.rating >= 1 && item.rating <= 5) {
            counts[item.rating] += 1;
        }
    });

    const total = ratings.length || 1;
    distributionContainer.innerHTML = [5, 4, 3, 2, 1].map(score => {
        const percentage = Math.round((counts[score] / total) * 100);
        return `
            <div>
                <span>${score} ★</span>
                <span>${percentage}%</span>
                <div class="bar"><span class="bar-fill" style="width: ${percentage}%;"></span></div>
            </div>
        `;
    }).join('');
}

function updateRatingPreview() {
    const previewElement = document.getElementById('ratingPreview');
    if (!previewElement) return;

    const userName = document.getElementById('userName')?.value.trim();
    const selectedRating = document.querySelector('.star-rating input:checked');
    const comment = document.getElementById('comment')?.value.trim();

    if (!userName && !selectedRating && !comment) {
        previewElement.textContent = 'اكتب اسمك، اختر التقييم، واكتب تعليقًا لمشاهدة معاينة حية هنا.';
        return;
    }

    const previewData = {
        userName: userName || 'عضو NO Fear',
        rating: selectedRating ? Number(selectedRating.value) : 0,
        comment: comment || 'لا يوجد تعليق',
        preview: true
    };

    previewElement.textContent = JSON.stringify(previewData, null, 2);
}

function updateAverageRating() {
    const averageRatingElement = document.getElementById('averageRating');
    const averageStarsElement = document.getElementById('averageStars');

    if (!averageRatingElement || !averageStarsElement) return;

    if (ratings.length === 0) {
        averageRatingElement.textContent = '0.0';
        averageStarsElement.textContent = '';
        return;
    }

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = (totalRating / ratings.length).toFixed(1);

    averageRatingElement.textContent = averageRating;
    averageStarsElement.textContent = '★'.repeat(Math.round(averageRating));
}

function loadRules() {
    fetch('rules.txt')
        .then(response => {
            if (!response.ok) throw new Error('no rules');
            return response.text();
        })
        .then(text => displayRules(text))
        .catch(() => displayFallbackRules());
}

function displayRules(rulesText) {
    const rulesContent = document.getElementById('rules-content');
    const rulesLoading = document.querySelector('.rules-loading');
    if (!rulesContent || !rulesLoading) return;

    rulesLoading.style.display = 'none';
    rulesContent.innerHTML = formatRulesText(rulesText);
}

function displayFallbackRules() {
    const rulesContent = document.getElementById('rules-content');
    const rulesLoading = document.querySelector('.rules-loading');
    if (!rulesContent || !rulesLoading) return;

    rulesLoading.style.display = 'none';
    rulesContent.innerHTML = `
        <h3>قواعد NO Fear</h3>
        <ul>
            <li>يمنع منعا باتا القذف و السب و المساس بالدين.</li>
            <li>يمنع نشر الصور و الفيديوهات المخلة بالاداب.</li>
            <li>يمنع الرد بالخطأ باي مشكلة كانت.</li>
            <li>استفزاز الاعضاء و الجدوله المتكرره يعرضك للسجن.</li>
            <li>الدخول بحسابات وهميه يعرضك للسجن.</li>
             <li>النشر بالعام او بالخاص يعرضك للبان.</li>
        </ul>
        <h3>العقوبات</h3>
        <ul>
            <li>تحذير أول ثم حظر مؤقت في حال التكرار.</li>
            <li>السجن الدائم للمخالفات الشديدة.</li>
        </ul>
    `;
}

function formatRulesText(text) {
    const lines = text.split('\n');
    let formattedHTML = '';
    let inList = false;

    lines.forEach(line => {
        line = line.trim();
        if (!line) {
            if (inList) {
                formattedHTML += '</ul>';
                inList = false;
            }
            return;
        }

        if (line.match(/^\d+\./) || line.match(/^[-•]/)) {
            if (!inList) {
                formattedHTML += '<ul>';
                inList = true;
            }
            const cleanLine = line.replace(/^\d+\.|^[-•]/, '').trim();
            formattedHTML += `<li>${escapeHtml(cleanLine)}</li>`;
        } else if (line.match(/^#/)) {
            if (inList) {
                formattedHTML += '</ul>';
                inList = false;
            }
            formattedHTML += `<h3>${escapeHtml(line.replace(/^#/, '').trim())}</h3>`;
        } else {
            if (inList) {
                formattedHTML += '</ul>';
                inList = false;
            }
            formattedHTML += `<p>${escapeHtml(line)}</p>`;
        }
    });

    if (inList) {
        formattedHTML += '</ul>';
    }
    return formattedHTML;
}

function copyInviteLink() {
    navigator.clipboard.writeText(INVITE_LINK).then(() => {
        showNotification('تم نسخ رابط الدعوة!', 'success');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = INVITE_LINK;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('تم نسخ رابط الدعوة!', 'success');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    if (!notification || !notificationText) return;

    notificationText.textContent = message;
    notification.className = 'notification';

    if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #ff4444, #cc0000)';
        notification.style.color = '#111';
    } else if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #44ff44, #00cc00)';
        notification.style.color = '#111';
    } else {
        notification.style.background = 'linear-gradient(135deg, #f4f4f4, #c0c0c0)';
        notification.style.color = '#111';
    }

    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.star-rating label');
    const ratingValue = parseInt(rating);
    stars.forEach((star, index) => {
        star.style.color = index < ratingValue ? '#f4f4f4' : '#4a4a4a';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportRatings() {
    if (!ratings.length) {
        showNotification('لا توجد تقييمات للتصدير بعد', 'error');
        return;
    }
    const dataStr = JSON.stringify(ratings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nofear-ratings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('تم تصدير التقييمات بنجاح', 'success');
}

function importRatings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('invalid');
            ratings = imported;
            saveRatings();
            displayRatings();
            updateAverageRating();
            showNotification('تم استيراد التقييمات بنجاح', 'success');
        } catch {
            showNotification('ملف غير صحيح أو تالف', 'error');
        }
    };
    reader.readAsText(file);
}

function showDownloadJSONButton() {
    const ratingsDisplay = document.querySelector('.ratings-display');
    if (!ratingsDisplay) return;

    let downloadBtn = document.getElementById('downloadJSONBtn');
    if (!downloadBtn) {
        downloadBtn = document.createElement('button');
        downloadBtn.id = 'downloadJSONBtn';
        downloadBtn.className = 'submit-btn';
        downloadBtn.style.marginTop = '20px';
        downloadBtn.innerText = '📥 تحميل ملف JSON المحدث';
        downloadBtn.addEventListener('click', downloadUpdatedJSON);
        ratingsDisplay.appendChild(downloadBtn);
    }
}

function downloadUpdatedJSON() {
    if (!window.updatedRatingsURL) {
        showNotification('لا يوجد ملف JSON محدث للتحميل', 'error');
        return;
    }
    const link = document.createElement('a');
    link.href = window.updatedRatingsURL;
    link.download = 'updated-ratings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('تم تحميل ملف JSON المحدث!', 'success');
}

function startMemberCounter() {
    const memberCount = document.getElementById('memberCount');
    if (!memberCount) return;
    let current = 1800;
    memberCount.textContent = `+${current} عضو`;

    setInterval(() => {
        current += Math.floor(Math.random() * 4);
        memberCount.textContent = `+${current} عضو`;
    }, 5000);
}
