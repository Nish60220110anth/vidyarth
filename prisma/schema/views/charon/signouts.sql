SELECT
  lower(
    md5(
      concat(
        coalesce(`s`.`pcom_id`, ''),
        '|',
        date_format(`s`.`signout_time`, '%Y-%m-%d %H:%i:%s.%f'),
        '|',
        coalesce(`s`.`signout_type`, '')
      )
    )
  ) AS `id`,
  `s`.`pcom_id` AS `pcomid`,
  `u`.`id` AS `userId`,
  `s`.`signout_type` AS `signout_type`,
  `s`.`signout_time` AS `signout_time`
FROM
  (
    `chitragupta`.`signouts` `s`
    LEFT JOIN `charon`.`user` `u` ON((`u`.`pcomid` = `s`.`pcom_id`))
  )