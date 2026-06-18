const SafeUser = require("../../database/schemas/SafeUser"); // Şemanın yolu projene göre doğru olsun kanka

/**
 * Guard işlemlerinde kullanıcının beyaz listede olup olmadığını kontrol eder.
 * @param {object} guild - İşlemin yapıldığı sunucu objesi
 * @param {object} executor - İşlemi yapan kullanıcı (Audit Log'dan gelen)
 * @return {Promise<boolean>} - Güvenliyse true, engellenmesi gerekiyorsa false döner.
 */
async function isUserSafe(guild, executor) {
    if (!executor || executor.bot) return true; // Botları veya bulunamayanları es geç

    const BOT_OWNER_ID = "1469310778518536265"; // Kendi Discord ID'n

    // 👑 1. Kurucu ve Bot Sahibi Bypass
    if (executor.id === BOT_OWNER_ID || executor.id === guild.ownerId) {
        return true; 
    }

    // 🔍 2. Veritabanındaki Safe List Kontrolü
    const isSafe = await SafeUser.findOne({ guildID: guild.id, id: executor.id });
    if (isSafe) {
        return true;
    }

    // Kullanıcı güvenli değilse, guard devreye girsin diye false döndürür
    return false;
}

module.exports = { isUserSafe };
