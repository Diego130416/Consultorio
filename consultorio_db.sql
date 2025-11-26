-- phpMyAdmin SQL Dump
-- version 3.5.1
-- http://www.phpmyadmin.net
--
-- Servidor: localhost
-- Tiempo de generación: 25-11-2025 a las 13:25:52
-- Versión del servidor: 5.5.24-log
-- Versión de PHP: 5.4.3

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de datos: `consultorio_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `citas`
--

CREATE TABLE IF NOT EXISTS `citas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_paciente` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `estado` enum('activa','completada') NOT NULL DEFAULT 'activa',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_completada` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_paciente` (`id_paciente`),
  KEY `fecha_hora` (`fecha`,`hora`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=7 ;

--
-- Volcado de datos para la tabla `citas`
--

INSERT INTO `citas` (`id`, `id_paciente`, `fecha`, `hora`, `estado`, `fecha_creacion`, `fecha_completada`) VALUES
(6, 4, '2025-11-25', '09:00:00', 'activa', '2025-11-25 02:23:36', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_clinico`
--

CREATE TABLE IF NOT EXISTS `historial_clinico` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_paciente` int(11) NOT NULL,
  `tipo_registro` varchar(50) NOT NULL COMMENT 'Ej: Receta, Pago, Estudio',
  `datos` text NOT NULL COMMENT 'Datos completos en formato JSON',
  `fecha_registro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_paciente` (`id_paciente`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=31 ;

--
-- Volcado de datos para la tabla `historial_clinico`
--

INSERT INTO `historial_clinico` (`id`, `id_paciente`, `tipo_registro`, `datos`, `fecha_registro`) VALUES
(1, 4, 'Cita agendada', '{"fecha":"2025-11-18","hora":"15:00:00"}', '2025-11-15 21:51:37'),
(2, 4, 'Receta emitida', '{"medications":[{"name":"dws","dose":"sfd","form":"fd","freq":"fd","dur":"fds","instr":""}],"recommendations":""}', '2025-11-15 21:53:29'),
(3, 4, 'Receta emitida', '{"medications":[{"name":"sx","dose":"xs","form":"xs","freq":"xs","dur":"as","instr":"sx"}],"recommendations":"asx"}', '2025-11-15 21:54:14'),
(4, 4, 'Registro de Pago', '{"concept":"Consulta de Traumatolog\\u00eda","method":"Transferencia Bancaria","amount":"8115","facturado":true,"facturaEmitida":true,"createdAt":"2025-11-15"}', '2025-11-15 21:54:43'),
(5, 4, 'Diagnóstico', '{"title":"sax","description":"sx","createdAt":"2025-11-15"}', '2025-11-15 21:55:01'),
(6, 4, 'Estudio Médico', '{"date":"2025-02-13","type":"d","bodyPart":"ds","findings":"dsa","images":[],"createdAt":"2025-11-15"}', '2025-11-15 21:55:29'),
(7, 4, 'Registro de Pago', '{"concept":"Consulta de Traumatolog\\u00eda","method":"Tarjeta de Cr\\u00e9dito\\/D\\u00e9bito","amount":"500","facturado":true,"facturaEmitida":false,"createdAt":"2025-11-16"}', '2025-11-16 00:39:51'),
(8, 4, 'Cita eliminada', '{"fecha":"2025-11-18","hora":"15:00:00","id_cita":1}', '2025-11-18 14:08:56'),
(9, 6, 'Cita agendada', '{"fecha":"2025-11-19","hora":"16:00:00"}', '2025-11-18 16:17:49'),
(10, 6, 'Diagnóstico', '{"title":"Bursulitis a nivel de rodilla","description":"Tomar medicamentos y asistir a sesiones de terapia","createdAt":"2025-11-18"}', '2025-11-18 16:20:43'),
(11, 6, 'Cita eliminada', '{"fecha":"2025-11-19","hora":"16:00:00","id_cita":2}', '2025-11-20 01:31:37'),
(12, 4, 'Diagnóstico', '{"title":"dw","description":"dw","createdAt":"2025-11-20"}', '2025-11-20 01:34:51'),
(13, 4, 'Diagnóstico', '{"title":"d","description":"dw","createdAt":"2025-11-20"}', '2025-11-20 02:37:31'),
(14, 4, 'Receta emitida', '{"medications":[{"name":"dw","dose":"dw","form":"dw","freq":"dw","dur":"dw","instr":"wd"}],"recommendations":"wd"}', '2025-11-20 02:37:50'),
(15, 4, 'Receta emitida', '{"medications":[{"name":"dw","dose":"dw","form":"daw","freq":"daw","dur":"daw","instr":"da"}],"recommendations":"da"}', '2025-11-20 02:55:35'),
(16, 4, 'Diagnóstico', '{"title":"dw","description":"dqw","createdAt":"2025-11-20"}', '2025-11-20 02:56:09'),
(17, 4, 'Receta emitida', '{"medications":[{"name":"dw","dose":"dwq","form":"w","freq":"wd","dur":"dw","instr":"wd"}],"recommendations":""}', '2025-11-20 02:56:26'),
(18, 4, 'Diagnóstico', '{"title":"dw","description":"dw","createdAt":"2025-11-20"}', '2025-11-20 14:13:52'),
(19, 4, 'Receta emitida', '{"diagnosis":"dw","studiesRequest":"adwd","medications":[{"name":"dw","dose":"dw","freq":"daw","dur":"awd","instr":"awd"}],"recommendations":"daw"}', '2025-11-20 14:14:30'),
(20, 5, 'Diagnóstico', '{"title":"xwd","description":"dw","createdAt":"2025-11-20"}', '2025-11-20 14:15:14'),
(21, 5, 'Receta emitida', '{"diagnosis":"daw","studiesRequest":"da","medications":[{"name":"daw","dose":"daw","freq":"adw","dur":"dwa","instr":"dwa"}],"recommendations":"daw"}', '2025-11-20 14:15:31'),
(22, 6, 'Diagnóstico', '{"title":"dw","description":"dw","createdAt":"2025-11-20"}', '2025-11-20 14:25:42'),
(23, 6, 'Receta emitida', '{"studiesRequest":"wad","medications":[{"name":"dw","dose":"wda","freq":"wd","dur":"wd","instr":"dwa"}],"recommendations":"daw"}', '2025-11-20 14:26:07'),
(24, 4, 'Cita agendada', '{"fecha":"2025-11-21","hora":"17:00:00"}', '2025-11-20 14:52:06'),
(25, 4, 'Cita eliminada', '{"fecha":"2025-11-21","hora":"17:00:00","id_cita":3}', '2025-11-20 14:53:20'),
(26, 4, 'Cita agendada', '{"fecha":"2025-11-25","hora":"15:00:00"}', '2025-11-24 14:18:26'),
(27, 4, 'Cita eliminada', '{"fecha":"2025-11-25","hora":"15:00:00","id_cita":4}', '2025-11-24 14:24:31'),
(28, 4, 'Cita agendada', '{"fecha":"2025-11-26","hora":"08:00:00"}', '2025-11-25 02:00:45'),
(29, 4, 'Cita eliminada', '{"fecha":"2025-11-26","hora":"08:00:00","id_cita":5}', '2025-11-25 02:01:06'),
(30, 4, 'Cita agendada', '{"fecha":"2025-11-25","hora":"09:00:00"}', '2025-11-25 02:23:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horarios_bloqueados`
--

CREATE TABLE IF NOT EXISTS `horarios_bloqueados` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fecha_hora` (`fecha`,`hora`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=7 ;

--
-- Volcado de datos para la tabla `horarios_bloqueados`
--

INSERT INTO `horarios_bloqueados` (`id`, `fecha`, `hora`) VALUES
(6, '2025-11-25', '09:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pacientes`
--

CREATE TABLE IF NOT EXISTS `pacientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido_paterno` varchar(100) NOT NULL,
  `apellido_materno` varchar(100) DEFAULT NULL,
  `nombre_completo` varchar(300) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `edad` int(3) DEFAULT NULL,
  `sexo` varchar(20) DEFAULT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `rfc` varchar(13) DEFAULT NULL,
  `alergias` text COMMENT 'JSON array de alergias',
  `enfermedades_cronicas` text COMMENT 'JSON array de enfermedades',
  `cirugias_previas` text COMMENT 'JSON array de objetos de cirugías',
  `medicamentos_actuales` text COMMENT 'JSON array de medicamentos',
  `antecedentes_familiares` text,
  `motivo_consulta` text,
  `sintomas` text,
  `consumo_sustancias` varchar(20) DEFAULT NULL,
  `detalle_sustancias` text COMMENT 'JSON objeto con nombre y frecuencia',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfc` (`rfc`),
  KEY `nombre_completo` (`nombre_completo`(191))
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=7 ;

--
-- Volcado de datos para la tabla `pacientes`
--

INSERT INTO `pacientes` (`id`, `nombre`, `apellido_paterno`, `apellido_materno`, `nombre_completo`, `fecha_nacimiento`, `edad`, `sexo`, `telefono`, `rfc`, `alergias`, `enfermedades_cronicas`, `cirugias_previas`, `medicamentos_actuales`, `antecedentes_familiares`, `motivo_consulta`, `sintomas`, `consumo_sustancias`, `detalle_sustancias`, `fecha_creacion`) VALUES
(4, 'Luis Diego', 'Pérez', 'Olvera', 'Luis Diego Pérez Olvera', '1998-04-13', 27, 'Masculino', NULL, 'PEOL980413', '[]', '[]', '[]', '[]', '', 'wd', '', NULL, '{}', '2025-11-15 20:41:12'),
(5, 'Miriam Alenadra', 'Ruiz', 'Vaquez', 'Miriam Alenadra Ruiz Vaquez', '2000-06-16', 25, 'Femenino', NULL, 'RUVM000616', '[]', '[]', '[]', '[]', '', 'sd', '', NULL, '{}', '2025-11-15 20:55:37'),
(6, 'Ma. Del Consuelo', 'Frias', 'Maldonado', 'Ma. Del Consuelo Frias Maldonado', '1968-10-23', 57, 'Femenino', '4421280149', 'FIMC681023', '["Penicilina","Ibuprofeno"]', '["Hipertensi\\u00f3n arterial"]', '[{"date":"2000-10-20","procedure":"cirugia de brazo","complication":"ninguna"}]', '["Ibuprofeno","Losart\\u00e1n"]', 'Ninguno', 'dolor de rodilla', 'se queda trabada', 'No', '{}', '2025-11-18 16:04:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `rol` enum('medico','paciente') NOT NULL,
  `id_paciente_asociado` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  KEY `usuarios_ibfk_1` (`id_paciente_asociado`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=2 ;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre_usuario`, `contrasena_hash`, `rol`, `id_paciente_asociado`) VALUES
(1, 'medico', '$2y$10$f.mN.fC.T8/bJ0wFG0y.lu1YN.P.7XN/fveT.XF5/1NqFO.i0.mWa', 'medico', NULL);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `citas`
--
ALTER TABLE `citas`
  ADD CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `historial_clinico`
--
ALTER TABLE `historial_clinico`
  ADD CONSTRAINT `historial_clinico_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_paciente_asociado`) REFERENCES `pacientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
