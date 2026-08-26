<?php
file_put_contents('C:\\xampppppp\\htdocs\\FlexPay\\backend\\public\\raw_debug.txt', file_get_contents('php://input'));
file_put_contents('C:\\xampppppp\\htdocs\\FlexPay\\backend\\public\\server_debug.txt', print_r($_SERVER, true), FILE_APPEND);
header('Content-Type: application/json');
echo json_encode(['ok' => true, 'raw' => file_get_contents('php://input')]);
