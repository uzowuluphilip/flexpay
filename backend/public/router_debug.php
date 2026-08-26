<?php
file_put_contents('C:\\xampppppp\\htdocs\\FlexPay\\backend\\public\\debug.log', print_r($_SERVER, true) . "\nMETHOD=" . ($_SERVER['REQUEST_METHOD'] ?? 'none') . "\nURI=" . ($_SERVER['REQUEST_URI'] ?? 'none') . "\n", FILE_APPEND);
var_dump($_SERVER['REQUEST_URI'] ?? 'none');
