document.addEventListener('DOMContentLoaded', function () {
    // DOM要素の取得
    const roomImages = document.querySelectorAll('.room-image');
    const roomSelect = document.getElementById('roomSelect');
    const reservationForm = document.getElementById('reservationForm');
    const startDate = document.getElementById('startDate');
    const startTime = document.getElementById('startTime');
    const endDate = document.getElementById('endDate');
    const endTime = document.getElementById('endTime');
    const reserverName = document.getElementById('reserverName');
    const reservationsContainer = document.getElementById('reservations');
    const downloadCSVButton = document.getElementById('downloadCSV');

    // 予約データを保存する配列
    let reservations = [];

    // 時刻選択肢を生成（15分単位）
    generate_time_options();

    // LocalStorageから予約データを読み込む
    load_reservations();

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
        const sDate = startDate.value;
        const sTime = startTime.value;
        const eDate = endDate.value;
        const eTime = endTime.value;
        const reserver = reserverName.value;

        // バリデーション
        if (!room || !sDate || !sTime || !eDate || !eTime || !reserver) {
            alert('全ての項目を入力してください。');
            return;
        }

        // 日時をISO形式に変換
        const start = `${sDate}T${sTime}:00`;
        const end = `${eDate}T${eTime}:00`;

        // 開始時間と終了時間の比較
        if (new Date(start) >= new Date(end)) {
            alert('終了時間は開始時間より後に設定してください。');
            return;
        }

        // 予約の重複チェック
        if (is_reservation_overlap(room, start, end)) {
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
        save_reservations();

        // 予約一覧を更新
        update_reservations_list();

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

        download_csv();
    });

    // 時刻選択肢を生成する関数（15分単位）
    function generate_time_options() {
        const timeSlots = [];
        // 9:00から21:00まで15分単位で選択肢を生成
        for (let hour = 9; hour <= 21; hour++) {
            const timeSlotMinutes = ['00', '15', '30', '45'];
            const minutesToAdd = (hour === 21) ? ['00'] : timeSlotMinutes;
            minutesToAdd.forEach(minute => {
                timeSlots.push({
                    value: `${hour.toString().padStart(2, '0')}:${minute}`,
                    text: `${hour.toString().padStart(2, '0')}:${minute}`
                });
            });
        }
        const startTimeSelect = document.getElementById('startTime');
        const endTimeSelect = document.getElementById('endTime');
        timeSlots.forEach(slot => {
            const startOption = document.createElement('option');
            startOption.value = slot.value;
            startOption.textContent = slot.text;
            startTimeSelect.appendChild(startOption);
            const endOption = document.createElement('option');
            endOption.value = slot.value;
            endOption.textContent = slot.text;
            endTimeSelect.appendChild(endOption);
        });
    }

    // 予約の重複チェック関数
    function is_reservation_overlap(room, start, end) {
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
    function update_reservations_list() {
        reservationsContainer.innerHTML = '';

        if (reservations.length === 0) {
            reservationsContainer.innerHTML = '<p class="no-reservations"><i class="fas fa-info-circle"></i> 予約はありません。</p>';
            return;
        }

        // 日付順にソート
        const sortedReservations = [...reservations].sort((a, b) => {
            return new Date(a.startDateTime) - new Date(b.startDateTime);
        });

        sortedReservations.forEach(reservation => {
            const startDate = new Date(reservation.startDateTime);
            const endDate = new Date(reservation.endDateTime);

            const formattedStartDate = format_date(startDate);
            const formattedEndDate = format_date(endDate);

            const reservationElement = document.createElement('div');
            reservationElement.className = `reservation-item room-${reservation.room.toLowerCase()}`;

            // 今日の予約かどうかを判定
            const today = new Date();
            const isToday = startDate.getDate() === today.getDate() &&
                startDate.getMonth() === today.getMonth() &&
                startDate.getFullYear() === today.getFullYear();

            // 予約状態のバッジを追加
            let statusBadge = '';
            if (isToday) {
                statusBadge = '<span class="badge today"><i class="fas fa-calendar-day"></i> 本日</span>';
            }

            reservationElement.innerHTML = `
                <div class="reservation-header">
                    <h3><i class="fas fa-building"></i> 会議室 ${reservation.room}</h3>
                    ${statusBadge}
                </div>
                <p><i class="far fa-clock"></i> <strong>日時:</strong> ${formattedStartDate} 〜 ${formattedEndDate}</p>
                <p><i class="fas fa-user"></i> <strong>予約者:</strong> ${reservation.reserverName}</p>
            `;

            reservationsContainer.appendChild(reservationElement);
        });
    }

    // 日付をフォーマットする関数
    function format_date(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }

    // LocalStorageに予約データを保存する関数
    function save_reservations() {
        localStorage.setItem('roomReservations', JSON.stringify(reservations));
    }

    // LocalStorageから予約データを読み込む関数
    function load_reservations() {
        const savedReservations = localStorage.getItem('roomReservations');
        if (savedReservations) {
            reservations = JSON.parse(savedReservations);
            update_reservations_list();
        }
    }

    // CSVをダウンロードする関数
    function download_csv() {
        // CSVのヘッダー
        const csvHeader = ['会議室', '開始日時', '終了日時', '予約者名', '予約作成日時'];

        // CSVのデータ行
        const csvRows = reservations.map(reservation => {
            return [
                reservation.room,
                format_date(new Date(reservation.startDateTime)),
                format_date(new Date(reservation.endDateTime)),
                reservation.reserverName,
                format_date(new Date(reservation.createdAt))
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
        link.setAttribute('download', `会議室予約_${format_date_for_filename(new Date())}.csv`);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ファイル名用の日付フォーマット関数
    function format_date_for_filename(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}`;
    }

    // 初期表示時に予約一覧を更新
    update_reservations_list();
}); 
