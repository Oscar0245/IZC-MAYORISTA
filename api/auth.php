<?php
/**
 * Registro e inicio de sesión por NIT y contraseña.
 * Guarda hashes (PBKDF2) en data/usuarios.json — nunca la contraseña en claro.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$usersFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'usuarios.json';

function read_users($path) {
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function write_users($path, $users) {
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $json = json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($path, $json . "\n", LOCK_EX) !== false;
}

function normalize_nit($nit) {
    $nit = trim((string) $nit);
    $nit = preg_replace('/[\s.]/', '', $nit);
    return $nit;
}

function find_user($users, $nit) {
    foreach ($users as $i => $u) {
        if (isset($u['nit']) && normalize_nit($u['nit']) === $nit) {
            return [$i, $u];
        }
    }
    return [null, null];
}

function hash_password($password) {
    $iterations = 100000;
    $salt = random_bytes(16);
    $hash = hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true);
    return 'pbkdf2$' . $iterations . '$' . base64_encode($salt) . '$' . base64_encode($hash);
}

function verify_password($password, $user) {
    $stored = (string) ($user['password_hash'] ?? '');
    if ($stored !== '' && str_starts_with($stored, 'pbkdf2$')) {
        $parts = explode('$', $stored);
        if (count($parts) !== 4) {
            return false;
        }
        $iterations = (int) $parts[1];
        $salt = base64_decode($parts[2], true);
        $expected = base64_decode($parts[3], true);
        if ($salt === false || $expected === false) {
            return false;
        }
        $actual = hash_pbkdf2('sha256', $password, $salt, $iterations, strlen($expected), true);
        return hash_equals($expected, $actual);
    }

    // Compatibilidad con registros viejos en texto plano
    $legacy = (string) ($user['password'] ?? '');
    return $legacy !== '' && hash_equals($legacy, $password);
}

function public_user($nit, $passwordHash, $createdAt, $nombre = '') {
    return [
        'nit' => $nit,
        'nombre' => trim((string) $nombre),
        'password_hash' => $passwordHash,
        'created_at' => $createdAt ?: date('c'),
    ];
}

function json_out($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$body = [];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        $body = $_POST;
    }
}

$action = $body['action'] ?? ($_GET['action'] ?? '');

if ($action === 'register') {
    $nit = normalize_nit($body['nit'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $nombre = trim((string) ($body['nombre'] ?? ($body['name'] ?? '')));

    if ($nombre === '' || mb_strlen($nombre) < 2) {
        json_out(['ok' => false, 'error' => 'Ingresa un nombre válido (mínimo 2 caracteres).'], 400);
    }
    if ($nit === '' || !preg_match('/^\d{6,15}(-\d)?$/', $nit)) {
        json_out(['ok' => false, 'error' => 'NIT inválido. Usa solo números (opcional dígito de verificación).'], 400);
    }
    if (strlen($password) < 4) {
        json_out(['ok' => false, 'error' => 'La contraseña debe tener al menos 4 caracteres.'], 400);
    }

    $users = read_users($usersFile);
    [, $existing] = find_user($users, $nit);
    if ($existing) {
        json_out(['ok' => false, 'error' => 'Este NIT ya está registrado.'], 409);
    }

    $users[] = public_user($nit, hash_password($password), date('c'), $nombre);

    if (!write_users($usersFile, $users)) {
        json_out(['ok' => false, 'error' => 'No se pudo guardar el usuario en el archivo.'], 500);
    }

    json_out(['ok' => true, 'nit' => $nit, 'nombre' => $nombre, 'message' => 'Registro exitoso.']);
}

if ($action === 'login') {
    $nit = normalize_nit($body['nit'] ?? '');
    $password = (string) ($body['password'] ?? '');

    if ($nit === '' || $password === '') {
        json_out(['ok' => false, 'error' => 'Ingresa NIT y contraseña.'], 400);
    }

    $users = read_users($usersFile);
    [$idx, $user] = find_user($users, $nit);
    if (!$user || !verify_password($password, $user)) {
        json_out(['ok' => false, 'error' => 'NIT o contraseña incorrectos.'], 401);
    }

    if (empty($user['password_hash'])) {
        $users[$idx] = public_user($user['nit'], hash_password($password), $user['created_at'] ?? date('c'), $user['nombre'] ?? '');
        write_users($usersFile, $users);
        $user = $users[$idx];
    }

    json_out([
        'ok' => true,
        'nit' => $user['nit'],
        'nombre' => (string) ($user['nombre'] ?? ''),
        'message' => 'Sesión iniciada.',
    ]);
}

$adminNits = ['03166122778'];

if ($action === 'list') {
    $adminNit = normalize_nit($body['admin_nit'] ?? '');
    if ($adminNit === '' || !in_array($adminNit, $adminNits, true)) {
        json_out(['ok' => false, 'error' => 'No autorizado.'], 403);
    }
    $users = read_users($usersFile);
    $safe = [];
    foreach ($users as $u) {
        $safe[] = [
            'nit' => (string) ($u['nit'] ?? ''),
            'nombre' => trim((string) ($u['nombre'] ?? '')),
            'created_at' => (string) ($u['created_at'] ?? ''),
        ];
    }
    json_out(['ok' => true, 'users' => $safe, 'count' => count($safe)]);
}

if ($action === 'delete') {
    $adminNit = normalize_nit($body['admin_nit'] ?? '');
    if ($adminNit === '' || !in_array($adminNit, $adminNits, true)) {
        json_out(['ok' => false, 'error' => 'No autorizado.'], 403);
    }
    $nit = normalize_nit($body['nit'] ?? '');
    if ($nit === '' || !preg_match('/^\d{6,15}(-\d)?$/', $nit)) {
        json_out(['ok' => false, 'error' => 'NIT inválido.'], 400);
    }
    if ($nit === $adminNit) {
        json_out(['ok' => false, 'error' => 'No puedes eliminar tu propia cuenta de administrador.'], 400);
    }
    $users = read_users($usersFile);
    $next = [];
    $removed = false;
    foreach ($users as $u) {
        if (normalize_nit($u['nit'] ?? '') === $nit) {
            $removed = true;
            continue;
        }
        $next[] = $u;
    }
    if (!$removed) {
        json_out(['ok' => false, 'error' => 'Usuario no encontrado.'], 404);
    }
    if (!write_users($usersFile, $next)) {
        json_out(['ok' => false, 'error' => 'No se pudo guardar el archivo.'], 500);
    }
    json_out(['ok' => true, 'nit' => $nit, 'message' => 'Usuario eliminado.']);
}

if ($action === 'sync') {
    $incoming = $body['users'] ?? [];
    if (!is_array($incoming)) {
        json_out(['ok' => false, 'error' => 'Lista de usuarios inválida.'], 400);
    }
    $clean = [];
    foreach ($incoming as $u) {
        if (!is_array($u)) {
            continue;
        }
        $nit = normalize_nit($u['nit'] ?? '');
        if ($nit === '' || !preg_match('/^\d{6,15}(-\d)?$/', $nit)) {
            continue;
        }
        $nombre = trim((string) ($u['nombre'] ?? ($u['name'] ?? '')));
        $existingHash = (string) ($u['password_hash'] ?? '');
        if ($existingHash !== '' && str_starts_with($existingHash, 'pbkdf2$')) {
            $clean[] = public_user($nit, $existingHash, (string) ($u['created_at'] ?? date('c')), $nombre);
            continue;
        }
        $password = (string) ($u['password'] ?? '');
        if (strlen($password) < 4) {
            continue;
        }
        $clean[] = public_user($nit, hash_password($password), (string) ($u['created_at'] ?? date('c')), $nombre);
    }
    if (!write_users($usersFile, $clean)) {
        json_out(['ok' => false, 'error' => 'No se pudo guardar usuarios.json.'], 500);
    }
    json_out(['ok' => true, 'count' => count($clean), 'message' => 'Usuarios guardados en data/usuarios.json']);
}

json_out(['ok' => false, 'error' => 'Acción no válida. Usa register, login, list, delete o sync.'], 400);
