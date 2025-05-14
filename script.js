document.addEventListener('DOMContentLoaded', function () {
    // DOM要素の取得
    const roomImages = document.querySelectorAll('.room-image');
    const roomSelect = document.getElementById('roomSelect');
    const reservationForm = document.getElementById('reservationForm');
    const startDateTime = document.getElementById('startDateTime');
    const endDateTime = document.getElementById('endDateTime');
    const reserverName = document.getElementById('reserverName');
    const reservationsContainer = document.getElementById('reservations');
    const downloadCSVButton = document.getElementById('downloadCSV');

    // 予約データを保存する配列
    let reservations = [];

    // LocalStorageから予約データを読み込む
    loadReservations();

    // 会議室画像のクリックイベント
    roomImages.forEach(image => {
        image.addEventListener('click', function () {
            // 全ての画像から選択状態を解除
            roomImages.forEach(img => img.classList.remove('selected'));

            // クリックされた画像を選択状態にする
            this.classList.add('selected');

            // 選択された会議室をフォームに設定
            const roomValue = this.getAttribute('data-room');
            roomSelect.value = roomValue;
        });
    });

    // 会議室選択が変更された時に画像の選択状態を更新
    roomSelect.addEventListener('change', function () {
        const selectedRoom = this.value;

        // 全ての画像から選択状態を解除
        roomImages.forEach(img => img.classList.remove('selected'));

        // 選択された会議室に対応する画像を選択状態にする
        if (selectedRoom) {
            const selectedImage = document.querySelector(`.room-image[data-room="${selectedRoom}"]`);
            if (selectedImage) {
                selectedImage.classList.add('selected');
            }
        }
    });

    // 予約フォームの送信イベント
    reservationForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // フォームの値を取得
        const room = roomSelect.value;
        const start = startDateTime.value;
        const end = endDateTime.value;
        const reserver = reserverName.value;

        // バリデーション
        if (!room || !start || !end || !reserver) {
            alert('全ての項目を入力してください。');
            return;
        }

        // 開始時間と終了時間の比較
        if (new Date(start) >= new Date(end)) {
            alert('終了時間は開始時間より後に設定してください。');
            return;
        }

        // 予約の重複チェック
        if (isReservationOverlap(room, start, end)) {
            alert('指定した時間には既に予約があります。別の時間を選択してください。');
            return;
        }

        // 予約データを作成
        const reservation = {
            room: room,
            startDateTime: start,
            endDateTime: end,
            reserverName: reserver,
            createdAt: new Date().toISOString()
        };

        // 予約データを配列に追加
        reservations.push(reservation);

        // LocalStorageに保存
        saveReservations();

        // 予約一覧を更新
        updateReservationsList();

        // フォームをリセット
        reservationForm.reset();
        roomImages.forEach(img => img.classList.remove('selected'));

        alert('予約が完了しました。');
    });

    // CSVダウンロードボタンのクリックイベント
    downloadCSVButton.addEventListener('click', function () {
        if (reservations.length === 0) {
            alert('ダウンロードする予約データがありません。');
            return;
        }

        downloadCSV();
    });

    // 予約の重複チェック関数
    function isReservationOverlap(room, start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);

        return reservations.some(reservation => {
            if (reservation.room !== room) return false;

            const reservationStart = new Date(reservation.startDateTime);
            const reservationEnd = new Date(reservation.endDateTime);

            // 予約時間が重複しているかチェック
            return (
                (startTime >= reservationStart && startTime < reservationEnd) ||
                (endTime > reservationStart && endTime <= reservationEnd) ||
                (startTime <= reservationStart && endTime >= reservationEnd)
            );
        });
    }

    // 予約一覧を更新する関数
    function updateReservationsList() {
        reservationsContainer.innerHTML = '';

        if (reservations.length === 0) {
            reservationsContainer.innerHTML = '<p>予約はありません。</p>';
            return;
        }

        // 日付順にソート
        const sortedReservations = [...reservations].sort((a, b) => {
            return new Date(a.startDateTime) - new Date(b.startDateTime);
        });

        sortedReservations.forEach(reservation => {
            const startDate = new Date(reservation.startDateTime);
            const endDate = new Date(reservation.endDateTime);

            const formattedStartDate = formatDate(startDate);
            const formattedEndDate = formatDate(endDate);

            const reservationElement = document.createElement('div');
            reservationElement.className = `reservation-item room-${reservation.room.toLowerCase()}`;
            reservationElement.innerHTML = `
                <p><strong>会議室:</strong> ${reservation.room}</p>
                <p><strong>日時:</strong> ${formattedStartDate} 〜 ${formattedEndDate}</p>
                <p><strong>予約者:</strong> ${reservation.reserverName}</p>
            `;

            reservationsContainer.appendChild(reservationElement);
        });
    }

    // 日付をフォーマットする関数
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }

    // LocalStorageに予約データを保存する関数
    function saveReservations() {
        localStorage.setItem('roomReservations', JSON.stringify(reservations));
    }

    // LocalStorageから予約データを読み込む関数
    function loadReservations() {
        const savedReservations = localStorage.getItem('roomReservations');
        if (savedReservations) {
            reservations = JSON.parse(savedReservations);
            updateReservationsList();
        }
    }

    // CSVをダウンロードする関数
    function downloadCSV() {
        // CSVのヘッダー
        const csvHeader = ['会議室', '開始日時', '終了日時', '予約者名', '予約作成日時'];

        // CSVのデータ行
        const csvRows = reservations.map(reservation => {
            return [
                reservation.room,
                formatDate(new Date(reservation.startDateTime)),
                formatDate(new Date(reservation.endDateTime)),
                reservation.reserverName,
                formatDate(new Date(reservation.createdAt))
            ];
        });

        // CSVデータを生成
        let csvContent = [csvHeader, ...csvRows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        // BOMを追加してUTF-8で正しく表示されるようにする
        const BOM = '\uFEFF';
        csvContent = BOM + csvContent;

        // CSVファイルとしてダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `会議室予約_${formatDateForFilename(new Date())}.csv`);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ファイル名用の日付フォーマット関数
    function formatDateForFilename(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}`;
    }

    // 初期表示時に予約一覧を更新
    updateReservationsList();
}); 